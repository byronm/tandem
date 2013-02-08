/*! Stypi Editor - v0.0.2 - 2013-02-07
 *  https://www.stypi.com/
 *  Copyright (c) 2013
 *  Jason Chen, Salesforce.com
 */

/**
 * Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Copyright 2012, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.681
 * Build date: 20 July 2012
 */
window.rangy = (function() {

    var OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";

    // Minimal set of properties required for DOM Level 2 Range compliance. Comparison constants such as START_TO_START
    // are omitted because ranges in KHTML do not have them but otherwise work perfectly well. See issue 113.
    var domRangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer"];

    // Minimal set of methods required for DOM Level 2 Range compliance
    var domRangeMethods = ["setStart", "setStartBefore", "setStartAfter", "setEnd", "setEndBefore",
        "setEndAfter", "collapse", "selectNode", "selectNodeContents", "compareBoundaryPoints", "deleteContents",
        "extractContents", "cloneContents", "insertNode", "surroundContents", "cloneRange", "toString", "detach"];

    var textRangeProperties = ["boundingHeight", "boundingLeft", "boundingTop", "boundingWidth", "htmlText", "text"];

    // Subset of TextRange's full set of methods that we're interested in
    var textRangeMethods = ["collapse", "compareEndPoints", "duplicate", "moveToElementText", "parentElement", "select",
        "setEndPoint", "getBoundingClientRect"];

    /*----------------------------------------------------------------------------------------------------------------*/

    // Trio of functions taken from Peter Michaux's article:
    // http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
    function isHostMethod(o, p) {
        var t = typeof o[p];
        return t == FUNCTION || (!!(t == OBJECT && o[p])) || t == "unknown";
    }

    function isHostObject(o, p) {
        return !!(typeof o[p] == OBJECT && o[p]);
    }

    function isHostProperty(o, p) {
        return typeof o[p] != UNDEFINED;
    }

    // Creates a convenience function to save verbose repeated calls to tests functions
    function createMultiplePropertyTest(testFunc) {
        return function(o, props) {
            var i = props.length;
            while (i--) {
                if (!testFunc(o, props[i])) {
                    return false;
                }
            }
            return true;
        };
    }

    // Next trio of functions are a convenience to save verbose repeated calls to previous two functions
    var areHostMethods = createMultiplePropertyTest(isHostMethod);
    var areHostObjects = createMultiplePropertyTest(isHostObject);
    var areHostProperties = createMultiplePropertyTest(isHostProperty);

    function isTextRange(range) {
        return range && areHostMethods(range, textRangeMethods) && areHostProperties(range, textRangeProperties);
    }

    var api = {
        version: "1.3alpha.681",
        initialized: false,
        supported: true,

        util: {
            isHostMethod: isHostMethod,
            isHostObject: isHostObject,
            isHostProperty: isHostProperty,
            areHostMethods: areHostMethods,
            areHostObjects: areHostObjects,
            areHostProperties: areHostProperties,
            isTextRange: isTextRange
        },

        features: {},

        modules: {},
        config: {
            alertOnFail: true,
            alertOnWarn: false,
            preferTextRange: false
        }
    };

    function alertOrLog(msg, shouldAlert) {
        if (shouldAlert) {
            window.alert(msg);
        } else if (typeof window.console != UNDEFINED && typeof window.console.log != UNDEFINED) {
            window.console.log(msg);
        }
    }

    function fail(reason) {
        api.initialized = true;
        api.supported = false;
        alertOrLog("Rangy is not supported on this page in your browser. Reason: " + reason, api.config.alertOnFail);
    }

    api.fail = fail;

    function warn(msg) {
        alertOrLog("Rangy warning: " + msg, api.config.alertOnWarn);
    }

    api.warn = warn;

    // Add utility extend() method
    if ({}.hasOwnProperty) {
        api.util.extend = function(obj, props, deep) {
            var o, p;
            for (var i in props) {
                if (props.hasOwnProperty(i)) {
                    o = obj[i];
                    p = props[i];
                    //if (deep) alert([o !== null, typeof o == "object", p !== null, typeof p == "object"])
                    if (deep && o !== null && typeof o == "object" && p !== null && typeof p == "object") {
                        api.util.extend(o, p, true);
                    }
                    obj[i] = p;
                }
            }
            return obj;
        };
    } else {
        fail("hasOwnProperty not supported");
    }

    var initListeners = [];
    var moduleInitializers = [];

    // Initialization
    function init() {
        if (api.initialized) {
            return;
        }
        var testRange;
        var implementsDomRange = false, implementsTextRange = false;

        // First, perform basic feature tests

        if (isHostMethod(document, "createRange")) {
            testRange = document.createRange();
            if (areHostMethods(testRange, domRangeMethods) && areHostProperties(testRange, domRangeProperties)) {
                implementsDomRange = true;
            }
            testRange.detach();
        }

        var body = isHostObject(document, "body") ? document.body : document.getElementsByTagName("body")[0];
        if (!body || body.nodeName.toLowerCase() != "body") {
            fail("No body element found");
            return;
        }

        if (body && isHostMethod(body, "createTextRange")) {
            testRange = body.createTextRange();
            if (isTextRange(testRange)) {
                implementsTextRange = true;
            }
        }

        if (!implementsDomRange && !implementsTextRange) {
            fail("Neither Range nor TextRange are available");
            return;
        }

        api.initialized = true;
        api.features = {
            implementsDomRange: implementsDomRange,
            implementsTextRange: implementsTextRange
        };

        // Initialize modules and call init listeners
        var allListeners = moduleInitializers.concat(initListeners);
        for (var i = 0, len = allListeners.length; i < len; ++i) {
            try {
                allListeners[i](api);
            } catch (ex) {
                if (isHostObject(window, "console") && isHostMethod(window.console, "log")) {
                    window.console.log("Rangy init listener threw an exception. Continuing.", ex);
                }
            }
        }
    }

    // Allow external scripts to initialize this library in case it's loaded after the document has loaded
    api.init = init;

    // Execute listener immediately if already initialized
    api.addInitListener = function(listener) {
        if (api.initialized) {
            listener(api);
        } else {
            initListeners.push(listener);
        }
    };

    var createMissingNativeApiListeners = [];

    api.addCreateMissingNativeApiListener = function(listener) {
        createMissingNativeApiListeners.push(listener);
    };

    function createMissingNativeApi(win) {
        win = win || window;
        init();

        // Notify listeners
        for (var i = 0, len = createMissingNativeApiListeners.length; i < len; ++i) {
            createMissingNativeApiListeners[i](win);
        }
    }

    api.createMissingNativeApi = createMissingNativeApi;

    function Module(name) {
        this.name = name;
        this.initialized = false;
        this.supported = false;
    }

    Module.prototype = {
        fail: function(reason) {
            this.initialized = true;
            this.supported = false;
            throw new Error("Module '" + this.name + "' failed to load: " + reason);
        },

        warn: function(msg) {
            api.warn("Module " + this.name + ": " + msg);
        },

        deprecationNotice: function(deprecated, replacement) {
            api.warn("DEPRECATED: " + deprecated + " in module " + this.name + "is deprecated. Please use "
                + replacement + " instead");
        },

        createError: function(msg) {
            return new Error("Error in Rangy " + this.name + " module: " + msg);
        }
    };

    api.createModule = function(name, initFunc) {
        var module = new Module(name);
        api.modules[name] = module;

        moduleInitializers.push(function(api) {
            initFunc(api, module);
            module.initialized = true;
            module.supported = true;
        });
    };

    api.requireModules = function(modules) {
        for (var i = 0, len = modules.length, module, moduleName; i < len; ++i) {
            moduleName = modules[i];
            module = api.modules[moduleName];
            if (!module || !(module instanceof Module)) {
                throw new Error("Module '" + moduleName + "' not found");
            }
            if (!module.supported) {
                throw new Error("Module '" + moduleName + "' not supported");
            }
        }
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Wait for document to load before running tests

    var docReady = false;

    var loadHandler = function(e) {
        if (!docReady) {
            docReady = true;
            if (!api.initialized) {
                init();
            }
        }
    };

    // Test whether we have window and document objects that we will need
    if (typeof window == UNDEFINED) {
        fail("No window found");
        return;
    }
    if (typeof document == UNDEFINED) {
        fail("No document found");
        return;
    }

    if (isHostMethod(document, "addEventListener")) {
        document.addEventListener("DOMContentLoaded", loadHandler, false);
    }

    // Add a fallback in case the DOMContentLoaded event isn't supported
    if (isHostMethod(window, "addEventListener")) {
        window.addEventListener("load", loadHandler, false);
    } else if (isHostMethod(window, "attachEvent")) {
        window.attachEvent("onload", loadHandler);
    } else {
        fail("Window does not have required addEventListener or attachEvent method");
    }

    return api;
})();

rangy.createModule("DomUtil", function(api, module) {
    var UNDEF = "undefined";
    var util = api.util;

    // Perform feature tests
    if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
        module.fail("document missing a Node creation method");
    }

    if (!util.isHostMethod(document, "getElementsByTagName")) {
        module.fail("document missing getElementsByTagName method");
    }

    var el = document.createElement("div");
    if (!util.areHostMethods(el, ["insertBefore", "appendChild", "cloneNode"] ||
            !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]))) {
        module.fail("Incomplete Element implementation");
    }

    // innerHTML is required for Range's createContextualFragment method
    if (!util.isHostProperty(el, "innerHTML")) {
        module.fail("Element is missing innerHTML property");
    }

    var textNode = document.createTextNode("test");
    if (!util.areHostMethods(textNode, ["splitText", "deleteData", "insertData", "appendData", "cloneNode"] ||
            !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]) ||
            !util.areHostProperties(textNode, ["data"]))) {
        module.fail("Incomplete Text Node implementation");
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Removed use of indexOf because of a bizarre bug in Opera that is thrown in one of the Acid3 tests. I haven't been
    // able to replicate it outside of the test. The bug is that indexOf returns -1 when called on an Array that
    // contains just the document as a single element and the value searched for is the document.
    var arrayContains = /*Array.prototype.indexOf ?
        function(arr, val) {
            return arr.indexOf(val) > -1;
        }:*/

        function(arr, val) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === val) {
                    return true;
                }
            }
            return false;
        };

    // Opera 11 puts HTML elements in the null namespace, it seems, and IE 7 has undefined namespaceURI
    function isHtmlNamespace(node) {
        var ns;
        return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
    }

    function parentElement(node) {
        var parent = node.parentNode;
        return (parent.nodeType == 1) ? parent : null;
    }

    function getNodeIndex(node) {
        var i = 0;
        while( (node = node.previousSibling) ) {
            i++;
        }
        return i;
    }

    function getNodeLength(node) {
        switch (node.nodeType) {
            case 7:
            case 10:
                return 0;
            case 3:
            case 8:
                return node.length;
            default:
                return node.childNodes.length;
        }
    }

    function getCommonAncestor(node1, node2) {
        var ancestors = [], n;
        for (n = node1; n; n = n.parentNode) {
            ancestors.push(n);
        }

        for (n = node2; n; n = n.parentNode) {
            if (arrayContains(ancestors, n)) {
                return n;
            }
        }

        return null;
    }

    function isAncestorOf(ancestor, descendant, selfIsAncestor) {
        var n = selfIsAncestor ? descendant : descendant.parentNode;
        while (n) {
            if (n === ancestor) {
                return true;
            } else {
                n = n.parentNode;
            }
        }
        return false;
    }

    function isOrIsAncestorOf(ancestor, descendant) {
        return isAncestorOf(ancestor, descendant, true);
    }

    function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
        var p, n = selfIsAncestor ? node : node.parentNode;
        while (n) {
            p = n.parentNode;
            if (p === ancestor) {
                return n;
            }
            n = p;
        }
        return null;
    }

    function isCharacterDataNode(node) {
        var t = node.nodeType;
        return t == 3 || t == 4 || t == 8 ; // Text, CDataSection or Comment
    }

    function isTextOrCommentNode(node) {
        if (!node) {
            return false;
        }
        var t = node.nodeType;
        return t == 3 || t == 8 ; // Text or Comment
    }

    function insertAfter(node, precedingNode) {
        var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
        if (nextNode) {
            parent.insertBefore(node, nextNode);
        } else {
            parent.appendChild(node);
        }
        return node;
    }

    // Note that we cannot use splitText() because it is bugridden in IE 9.
    function splitDataNode(node, index, positionsToPreserve) {
        var newNode = node.cloneNode(false);
        newNode.deleteData(0, index);
        node.deleteData(index, node.length - index);
        insertAfter(newNode, node);

        // Preserve positions
        if (positionsToPreserve) {
            for (var i = 0, position; position = positionsToPreserve[i++]; ) {
                // Handle case where position was inside the portion of node after the split point
                if (position.node == node && position.offset > index) {
                    position.node = newNode;
                    position.offset -= index;
                }
                // Handle the case where the position is a node offset within node's parent
                else if (position.node == node.parentNode && position.offset > getNodeIndex(node)) {
                    ++position.offset;
                }
            }
        }
        return newNode;
    }

    function getDocument(node) {
        if (node.nodeType == 9) {
            return node;
        } else if (typeof node.ownerDocument != UNDEF) {
            return node.ownerDocument;
        } else if (typeof node.document != UNDEF) {
            return node.document;
        } else if (node.parentNode) {
            return getDocument(node.parentNode);
        } else {
            throw module.createError("getDocument: no document found for node");
        }
    }

    function getWindow(node) {
        var doc = getDocument(node);
        if (typeof doc.defaultView != UNDEF) {
            return doc.defaultView;
        } else if (typeof doc.parentWindow != UNDEF) {
            return doc.parentWindow;
        } else {
            throw module.createError("Cannot get a window object for node");
        }
    }

    function getIframeDocument(iframeEl) {
        if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument;
        } else if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow.document;
        } else {
            throw module.createError("getIframeDocument: No Document object found for iframe element");
        }
    }

    function getIframeWindow(iframeEl) {
        if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow;
        } else if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument.defaultView;
        } else {
            throw module.createError("getIframeWindow: No Window object found for iframe element");
        }
    }

    function getBody(doc) {
        return util.isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
    }

    function isWindow(obj) {
        return obj && util.isHostMethod(obj, "setTimeout") && util.isHostObject(obj, "document");
    }

    function getContentDocument(obj) {
        var doc;

        if (!obj) {
            doc = document;
        }

        // Test if a DOM node has been passed and obtain a document object for it if so
        else if (util.isHostProperty(obj, "nodeType")) {
            doc = (obj.nodeType == 1 && obj.tagName.toLowerCase() == "iframe")
                ? getIframeDocument(obj) : getDocument(obj);
        }

        // Test if the doc parameter appears to be a Window object
        else if (isWindow(obj)) {
            doc = obj.document;
        }

        return doc;
    }

    function getRootContainer(node) {
        var parent;
        while ( (parent = node.parentNode) ) {
            node = parent;
        }
        return node;
    }

    function comparePoints(nodeA, offsetA, nodeB, offsetB) {
        // See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
        var nodeC, root, childA, childB, n;
        if (nodeA == nodeB) {
            // Case 1: nodes are the same
            return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) ) {
            // Case 2: node C (container B or an ancestor) is a child node of A
            return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) ) {
            // Case 3: node C (container A or an ancestor) is a child node of B
            return getNodeIndex(nodeC) < offsetB  ? -1 : 1;
        } else {
            // Case 4: containers are siblings or descendants of siblings
            root = getCommonAncestor(nodeA, nodeB);
            childA = (nodeA === root) ? root : getClosestAncestorIn(nodeA, root, true);
            childB = (nodeB === root) ? root : getClosestAncestorIn(nodeB, root, true);

            if (childA === childB) {
                // This shouldn't be possible
                throw module.createError("comparePoints got to case 4 and childA and childB are the same!");
            } else {
                n = root.firstChild;
                while (n) {
                    if (n === childA) {
                        return -1;
                    } else if (n === childB) {
                        return 1;
                    }
                    n = n.nextSibling;
                }
            }
        }
    }

    function inspectNode(node) {
        if (!node) {
            return "[No node]";
        }
        if (isCharacterDataNode(node)) {
            return '"' + node.data + '"';
        } else if (node.nodeType == 1) {
            var idAttr = node.id ? ' id="' + node.id + '"' : "";
            return "<" + node.nodeName + idAttr + ">[" + node.childNodes.length + "]";
        } else {
            return node.nodeName;
        }
    }

    function fragmentFromNodeChildren(node) {
        var fragment = getDocument(node).createDocumentFragment(), child;
        while ( (child = node.firstChild) ) {
            fragment.appendChild(child);
        }
        return fragment;
    }

    function NodeIterator(root) {
        this.root = root;
        this._next = root;
    }

    NodeIterator.prototype = {
        _current: null,

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            var n = this._current = this._next;
            var child, next;
            if (this._current) {
                child = n.firstChild;
                if (child) {
                    this._next = child;
                } else {
                    next = null;
                    while ((n !== this.root) && !(next = n.nextSibling)) {
                        n = n.parentNode;
                    }
                    this._next = next;
                }
            }
            return this._current;
        },

        detach: function() {
            this._current = this._next = this.root = null;
        }
    };

    function createIterator(root) {
        return new NodeIterator(root);
    }

    function DomPosition(node, offset) {
        this.node = node;
        this.offset = offset;
    }

    DomPosition.prototype = {
        equals: function(pos) {
            return !!pos && this.node === pos.node && this.offset == pos.offset;
        },

        inspect: function() {
            return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
        },

        toString: function() {
            return this.inspect();
        }
    };

    function DOMException(codeName) {
        this.code = this[codeName];
        this.codeName = codeName;
        this.message = "DOMException: " + this.codeName;
    }

    DOMException.prototype = {
        INDEX_SIZE_ERR: 1,
        HIERARCHY_REQUEST_ERR: 3,
        WRONG_DOCUMENT_ERR: 4,
        NO_MODIFICATION_ALLOWED_ERR: 7,
        NOT_FOUND_ERR: 8,
        NOT_SUPPORTED_ERR: 9,
        INVALID_STATE_ERR: 11
    };

    DOMException.prototype.toString = function() {
        return this.message;
    };

    api.dom = {
        arrayContains: arrayContains,
        isHtmlNamespace: isHtmlNamespace,
        parentElement: parentElement,
        getNodeIndex: getNodeIndex,
        getNodeLength: getNodeLength,
        getCommonAncestor: getCommonAncestor,
        isAncestorOf: isAncestorOf,
        isOrIsAncestorOf: isOrIsAncestorOf,
        getClosestAncestorIn: getClosestAncestorIn,
        isCharacterDataNode: isCharacterDataNode,
        isTextOrCommentNode: isTextOrCommentNode,
        insertAfter: insertAfter,
        splitDataNode: splitDataNode,
        getDocument: getDocument,
        getWindow: getWindow,
        getIframeWindow: getIframeWindow,
        getIframeDocument: getIframeDocument,
        getBody: getBody,
        isWindow: isWindow,
        getContentDocument: getContentDocument,
        getRootContainer: getRootContainer,
        comparePoints: comparePoints,
        inspectNode: inspectNode,
        fragmentFromNodeChildren: fragmentFromNodeChildren,
        createIterator: createIterator,
        DomPosition: DomPosition
    };

    api.DOMException = DOMException;
});
rangy.createModule("DomRange", function(api, module) {
    api.requireModules( ["DomUtil"] );

    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DOMException = api.DOMException;

    /*----------------------------------------------------------------------------------------------------------------*/

    // Utility functions

    function isNonTextPartiallySelected(node, range) {
        return (node.nodeType != 3) &&
               (dom.isOrIsAncestorOf(node, range.startContainer) || dom.isOrIsAncestorOf(node, range.endContainer));
    }

    function getRangeDocument(range) {
        return dom.getDocument(range.startContainer);
    }

    function getBoundaryBeforeNode(node) {
        return new DomPosition(node.parentNode, dom.getNodeIndex(node));
    }

    function getBoundaryAfterNode(node) {
        return new DomPosition(node.parentNode, dom.getNodeIndex(node) + 1);
    }

    function insertNodeAtPosition(node, n, o) {
        var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
        if (dom.isCharacterDataNode(n)) {
            if (o == n.length) {
                dom.insertAfter(node, n);
            } else {
                n.parentNode.insertBefore(node, o == 0 ? n : dom.splitDataNode(n, o));
            }
        } else if (o >= n.childNodes.length) {
            n.appendChild(node);
        } else {
            n.insertBefore(node, n.childNodes[o]);
        }
        return firstNodeInserted;
    }

    function rangesIntersect(rangeA, rangeB, touchingIsIntersecting) {
        assertRangeValid(rangeA);
        assertRangeValid(rangeB);

        if (getRangeDocument(rangeB) != getRangeDocument(rangeA)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }

        var startComparison = dom.comparePoints(rangeA.startContainer, rangeA.startOffset, rangeB.endContainer, rangeB.endOffset),
            endComparison = dom.comparePoints(rangeA.endContainer, rangeA.endOffset, rangeB.startContainer, rangeB.startOffset);

        return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
    }

    function cloneSubtree(iterator) {
        var partiallySelected;
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
            partiallySelected = iterator.isPartiallySelectedSubtree();
            node = node.cloneNode(!partiallySelected);
            if (partiallySelected) {
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(cloneSubtree(subIterator));
                subIterator.detach(true);
            }

            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    function iterateSubtree(rangeIterator, func, iteratorState) {
        var it, n;
        iteratorState = iteratorState || { stop: false };
        for (var node, subRangeIterator; node = rangeIterator.next(); ) {
            if (rangeIterator.isPartiallySelectedSubtree()) {
                if (func(node) === false) {
                    iteratorState.stop = true;
                    return;
                } else {
                    // The node is partially selected by the Range, so we can use a new RangeIterator on the portion of
                    // the node selected by the Range.
                    subRangeIterator = rangeIterator.getSubtreeIterator();
                    iterateSubtree(subRangeIterator, func, iteratorState);
                    subRangeIterator.detach(true);
                    if (iteratorState.stop) {
                        return;
                    }
                }
            } else {
                // The whole node is selected, so we can use efficient DOM iteration to iterate over the node and its
                // descendants
                it = dom.createIterator(node);
                while ( (n = it.next()) ) {
                    if (func(n) === false) {
                        iteratorState.stop = true;
                        return;
                    }
                }
            }
        }
    }

    function deleteSubtree(iterator) {
        var subIterator;
        while (iterator.next()) {
            if (iterator.isPartiallySelectedSubtree()) {
                subIterator = iterator.getSubtreeIterator();
                deleteSubtree(subIterator);
                subIterator.detach(true);
            } else {
                iterator.remove();
            }
        }
    }

    function extractSubtree(iterator) {
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {

            if (iterator.isPartiallySelectedSubtree()) {
                node = node.cloneNode(false);
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(extractSubtree(subIterator));
                subIterator.detach(true);
            } else {
                iterator.remove();
            }
            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    function getNodesInRange(range, nodeTypes, filter) {
        var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
        var filterExists = !!filter;
        if (filterNodeTypes) {
            regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
        }

        var nodes = [];
        iterateSubtree(new RangeIterator(range, false), function(node) {
            if ((!filterNodeTypes || regex.test(node.nodeType)) && (!filterExists || filter(node))) {
                nodes.push(node);
            }
        });
        return nodes;
    }

    function inspect(range) {
        var name = (typeof range.getName == "undefined") ? "Range" : range.getName();
        return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " +
                dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // RangeIterator code partially borrows from IERange by Tim Ryan (http://github.com/timcameronryan/IERange)

    function RangeIterator(range, clonePartiallySelectedTextNodes) {
        this.range = range;
        this.clonePartiallySelectedTextNodes = clonePartiallySelectedTextNodes;


        if (!range.collapsed) {
            this.sc = range.startContainer;
            this.so = range.startOffset;
            this.ec = range.endContainer;
            this.eo = range.endOffset;
            var root = range.commonAncestorContainer;

            if (this.sc === this.ec && dom.isCharacterDataNode(this.sc)) {
                this.isSingleCharacterDataNode = true;
                this._first = this._last = this._next = this.sc;
            } else {
                this._first = this._next = (this.sc === root && !dom.isCharacterDataNode(this.sc)) ?
                    this.sc.childNodes[this.so] : dom.getClosestAncestorIn(this.sc, root, true);
                this._last = (this.ec === root && !dom.isCharacterDataNode(this.ec)) ?
                    this.ec.childNodes[this.eo - 1] : dom.getClosestAncestorIn(this.ec, root, true);
            }
        }
    }

    RangeIterator.prototype = {
        _current: null,
        _next: null,
        _first: null,
        _last: null,
        isSingleCharacterDataNode: false,

        reset: function() {
            this._current = null;
            this._next = this._first;
        },

        hasNext: function() {
            return !!this._next;
        },

        next: function() {
            // Move to next node
            var current = this._current = this._next;
            if (current) {
                this._next = (current !== this._last) ? current.nextSibling : null;

                // Check for partially selected text nodes
                if (dom.isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
                    if (current === this.ec) {
                        (current = current.cloneNode(true)).deleteData(this.eo, current.length - this.eo);
                    }
                    if (this._current === this.sc) {
                        (current = current.cloneNode(true)).deleteData(0, this.so);
                    }
                }
            }

            return current;
        },

        remove: function() {
            var current = this._current, start, end;

            if (dom.isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
                start = (current === this.sc) ? this.so : 0;
                end = (current === this.ec) ? this.eo : current.length;
                if (start != end) {
                    current.deleteData(start, end - start);
                }
            } else {
                if (current.parentNode) {
                    current.parentNode.removeChild(current);
                } else {
                }
            }
        },

        // Checks if the current node is partially selected
        isPartiallySelectedSubtree: function() {
            var current = this._current;
            return isNonTextPartiallySelected(current, this.range);
        },

        getSubtreeIterator: function() {
            var subRange;
            if (this.isSingleCharacterDataNode) {
                subRange = this.range.cloneRange();
                subRange.collapse(false);
            } else {
                subRange = new Range(getRangeDocument(this.range));
                var current = this._current;
                var startContainer = current, startOffset = 0, endContainer = current, endOffset = dom.getNodeLength(current);

                if (dom.isOrIsAncestorOf(current, this.sc)) {
                    startContainer = this.sc;
                    startOffset = this.so;
                }
                if (dom.isOrIsAncestorOf(current, this.ec)) {
                    endContainer = this.ec;
                    endOffset = this.eo;
                }

                updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
            }
            return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
        },

        detach: function(detachRange) {
            if (detachRange) {
                this.range.detach();
            }
            this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
        }
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Exceptions

    function RangeException(codeName) {
        this.code = this[codeName];
        this.codeName = codeName;
        this.message = "RangeException: " + this.codeName;
    }

    RangeException.prototype = {
        BAD_BOUNDARYPOINTS_ERR: 1,
        INVALID_NODE_TYPE_ERR: 2
    };

    RangeException.prototype.toString = function() {
        return this.message;
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    var beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
    var rootContainerNodeTypes = [2, 9, 11];
    var readonlyNodeTypes = [5, 6, 10, 12];
    var insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
    var surroundNodeTypes = [1, 3, 4, 5, 7, 8];

    function createAncestorFinder(nodeTypes) {
        return function(node, selfIsAncestor) {
            var t, n = selfIsAncestor ? node : node.parentNode;
            while (n) {
                t = n.nodeType;
                if (dom.arrayContains(nodeTypes, t)) {
                    return n;
                }
                n = n.parentNode;
            }
            return null;
        };
    }

    var getRootContainer = dom.getRootContainer;
    var getDocumentOrFragmentContainer = createAncestorFinder( [9, 11] );
    var getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
    var getDocTypeNotationEntityAncestor = createAncestorFinder( [6, 10, 12] );

    function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
        if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
            throw new RangeException("INVALID_NODE_TYPE_ERR");
        }
    }

    function assertNotDetached(range) {
        if (!range.startContainer) {
            throw new DOMException("INVALID_STATE_ERR");
        }
    }

    function assertValidNodeType(node, invalidTypes) {
        if (!dom.arrayContains(invalidTypes, node.nodeType)) {
            throw new RangeException("INVALID_NODE_TYPE_ERR");
        }
    }

    function assertValidOffset(node, offset) {
        if (offset < 0 || offset > (dom.isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
            throw new DOMException("INDEX_SIZE_ERR");
        }
    }

    function assertSameDocumentOrFragment(node1, node2) {
        if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    function assertNodeNotReadOnly(node) {
        if (getReadonlyAncestor(node, true)) {
            throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
        }
    }

    function assertNode(node, codeName) {
        if (!node) {
            throw new DOMException(codeName);
        }
    }

    function isOrphan(node) {
        return !dom.arrayContains(rootContainerNodeTypes, node.nodeType) && !getDocumentOrFragmentContainer(node, true);
    }

    function isValidOffset(node, offset) {
        return offset <= (dom.isCharacterDataNode(node) ? node.length : node.childNodes.length);
    }

    function isRangeValid(range) {
        return (!!range.startContainer && !!range.endContainer
                && !isOrphan(range.startContainer)
                && !isOrphan(range.endContainer)
                && isValidOffset(range.startContainer, range.startOffset)
                && isValidOffset(range.endContainer, range.endOffset));
    }

    function assertRangeValid(range) {
        assertNotDetached(range);
        if (!isRangeValid(range)) {
            throw new Error("Range error: Range is no longer valid after DOM mutation (" + range.inspect() + ")");
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Test the browser's innerHTML support to decide how to implement createContextualFragment
    var styleEl = document.createElement("style");
    var htmlParsingConforms = false;
    try {
        styleEl.innerHTML = "<b>x</b>";
        htmlParsingConforms = (styleEl.firstChild.nodeType == 3); // Opera incorrectly creates an element node
    } catch (e) {
        // IE 6 and 7 throw
    }

    api.features.htmlParsingConforms = htmlParsingConforms;

    var createContextualFragment = htmlParsingConforms ?

        // Implementation as per HTML parsing spec, trusting in the browser's implementation of innerHTML. See
        // discussion and base code for this implementation at issue 67.
        // Spec: http://html5.org/specs/dom-parsing.html#extensions-to-the-range-interface
        // Thanks to Aleks Williams.
        function(fragmentStr) {
            // "Let node the context object's start's node."
            var node = this.startContainer;
            var doc = dom.getDocument(node);

            // "If the context object's start's node is null, raise an INVALID_STATE_ERR
            // exception and abort these steps."
            if (!node) {
                throw new DOMException("INVALID_STATE_ERR");
            }

            // "Let element be as follows, depending on node's interface:"
            // Document, Document Fragment: null
            var el = null;

            // "Element: node"
            if (node.nodeType == 1) {
                el = node;

            // "Text, Comment: node's parentElement"
            } else if (dom.isCharacterDataNode(node)) {
                el = dom.parentElement(node);
            }

            // "If either element is null or element's ownerDocument is an HTML document
            // and element's local name is "html" and element's namespace is the HTML
            // namespace"
            if (el === null || (
                el.nodeName == "HTML"
                && dom.isHtmlNamespace(dom.getDocument(el).documentElement)
                && dom.isHtmlNamespace(el)
            )) {

            // "let element be a new Element with "body" as its local name and the HTML
            // namespace as its namespace.""
                el = doc.createElement("body");
            } else {
                el = el.cloneNode(false);
            }

            // "If the node's document is an HTML document: Invoke the HTML fragment parsing algorithm."
            // "If the node's document is an XML document: Invoke the XML fragment parsing algorithm."
            // "In either case, the algorithm must be invoked with fragment as the input
            // and element as the context element."
            el.innerHTML = fragmentStr;

            // "If this raises an exception, then abort these steps. Otherwise, let new
            // children be the nodes returned."

            // "Let fragment be a new DocumentFragment."
            // "Append all new children to fragment."
            // "Return fragment."
            return dom.fragmentFromNodeChildren(el);
        } :

        // In this case, innerHTML cannot be trusted, so fall back to a simpler, non-conformant implementation that
        // previous versions of Rangy used (with the exception of using a body element rather than a div)
        function(fragmentStr) {
            assertNotDetached(this);
            var doc = getRangeDocument(this);
            var el = doc.createElement("body");
            el.innerHTML = fragmentStr;

            return dom.fragmentFromNodeChildren(el);
        };

    function splitRangeBoundaries(range, positionsToPreserve) {
        assertRangeValid(range);

        var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
        var startEndSame = (sc === ec);

        if (dom.isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
            dom.splitDataNode(ec, eo, positionsToPreserve);
        }

        if (dom.isCharacterDataNode(sc) && so > 0 && so < sc.length) {
            sc = dom.splitDataNode(sc, so, positionsToPreserve);
            if (startEndSame) {
                eo -= so;
                ec = sc;
            } else if (ec == sc.parentNode && eo >= dom.getNodeIndex(sc)) {
                eo++;
            }
            so = 0;
        }
        range.setStartAndEnd(sc, so, ec, eo);
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    var rangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer"];

    var s2s = 0, s2e = 1, e2e = 2, e2s = 3;
    var n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;

    function RangePrototype() {}

    RangePrototype.prototype = {
        compareBoundaryPoints: function(how, range) {
            assertRangeValid(this);
            assertSameDocumentOrFragment(this.startContainer, range.startContainer);

            var nodeA, offsetA, nodeB, offsetB;
            var prefixA = (how == e2s || how == s2s) ? "start" : "end";
            var prefixB = (how == s2e || how == s2s) ? "start" : "end";
            nodeA = this[prefixA + "Container"];
            offsetA = this[prefixA + "Offset"];
            nodeB = range[prefixB + "Container"];
            offsetB = range[prefixB + "Offset"];
            return dom.comparePoints(nodeA, offsetA, nodeB, offsetB);
        },

        insertNode: function(node) {
            assertRangeValid(this);
            assertValidNodeType(node, insertableNodeTypes);
            assertNodeNotReadOnly(this.startContainer);

            if (dom.isOrIsAncestorOf(node, this.startContainer)) {
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }

            // No check for whether the container of the start of the Range is of a type that does not allow
            // children of the type of node: the browser's DOM implementation should do this for us when we attempt
            // to add the node

            var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
            this.setStartBefore(firstNodeInserted);
        },

        cloneContents: function() {
            assertRangeValid(this);

            var clone, frag;
            if (this.collapsed) {
                return getRangeDocument(this).createDocumentFragment();
            } else {
                if (this.startContainer === this.endContainer && dom.isCharacterDataNode(this.startContainer)) {
                    clone = this.startContainer.cloneNode(true);
                    clone.data = clone.data.slice(this.startOffset, this.endOffset);
                    frag = getRangeDocument(this).createDocumentFragment();
                    frag.appendChild(clone);
                    return frag;
                } else {
                    var iterator = new RangeIterator(this, true);
                    clone = cloneSubtree(iterator);
                    iterator.detach();
                }
                return clone;
            }
        },

        canSurroundContents: function() {
            assertRangeValid(this);
            assertNodeNotReadOnly(this.startContainer);
            assertNodeNotReadOnly(this.endContainer);

            // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
            // no non-text nodes.
            var iterator = new RangeIterator(this, true);
            var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                    (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
            iterator.detach();
            return !boundariesInvalid;
        },

        surroundContents: function(node) {
            assertValidNodeType(node, surroundNodeTypes);

            if (!this.canSurroundContents()) {
                throw new RangeException("BAD_BOUNDARYPOINTS_ERR");
            }

            // Extract the contents
            var content = this.extractContents();

            // Clear the children of the node
            if (node.hasChildNodes()) {
                while (node.lastChild) {
                    node.removeChild(node.lastChild);
                }
            }

            // Insert the new node and add the extracted contents
            insertNodeAtPosition(node, this.startContainer, this.startOffset);
            node.appendChild(content);

            this.selectNode(node);
        },

        cloneRange: function() {
            assertRangeValid(this);
            var range = new Range(getRangeDocument(this));
            var i = rangeProperties.length, prop;
            while (i--) {
                prop = rangeProperties[i];
                range[prop] = this[prop];
            }
            return range;
        },

        toString: function() {
            assertRangeValid(this);
            var sc = this.startContainer;
            if (sc === this.endContainer && dom.isCharacterDataNode(sc)) {
                return (sc.nodeType == 3 || sc.nodeType == 4) ? sc.data.slice(this.startOffset, this.endOffset) : "";
            } else {
                var textBits = [], iterator = new RangeIterator(this, true);
                iterateSubtree(iterator, function(node) {
                    // Accept only text or CDATA nodes, not comments
                    if (node.nodeType == 3 || node.nodeType == 4) {
                        textBits.push(node.data);
                    }
                });
                iterator.detach();
                return textBits.join("");
            }
        },

        // The methods below are all non-standard. The following batch were introduced by Mozilla but have since
        // been removed from Mozilla.

        compareNode: function(node) {
            assertRangeValid(this);

            var parent = node.parentNode;
            var nodeIndex = dom.getNodeIndex(node);

            if (!parent) {
                throw new DOMException("NOT_FOUND_ERR");
            }

            var startComparison = this.comparePoint(parent, nodeIndex),
                endComparison = this.comparePoint(parent, nodeIndex + 1);

            if (startComparison < 0) { // Node starts before
                return (endComparison > 0) ? n_b_a : n_b;
            } else {
                return (endComparison > 0) ? n_a : n_i;
            }
        },

        comparePoint: function(node, offset) {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            if (dom.comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
                return -1;
            } else if (dom.comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
                return 1;
            }
            return 0;
        },

        createContextualFragment: createContextualFragment,

        toHtml: function() {
            assertRangeValid(this);
            var container = this.commonAncestorContainer.parentNode.cloneNode(false);
            container.appendChild(this.cloneContents());
            return container.innerHTML;
        },

        // touchingIsIntersecting determines whether this method considers a node that borders a range intersects
        // with it (as in WebKit) or not (as in Gecko pre-1.9, and the default)
        intersectsNode: function(node, touchingIsIntersecting) {
            assertRangeValid(this);
            assertNode(node, "NOT_FOUND_ERR");
            if (dom.getDocument(node) !== getRangeDocument(this)) {
                return false;
            }

            var parent = node.parentNode, offset = dom.getNodeIndex(node);
            assertNode(parent, "NOT_FOUND_ERR");

            var startComparison = dom.comparePoints(parent, offset, this.endContainer, this.endOffset),
                endComparison = dom.comparePoints(parent, offset + 1, this.startContainer, this.startOffset);

            return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
        },

        isPointInRange: function(node, offset) {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            return (dom.comparePoints(node, offset, this.startContainer, this.startOffset) >= 0) &&
                   (dom.comparePoints(node, offset, this.endContainer, this.endOffset) <= 0);
        },

        // The methods below are non-standard and invented by me.

        // Sharing a boundary start-to-end or end-to-start does not count as intersection.
        intersectsRange: function(range) {
            return rangesIntersect(this, range, false);
        },

        // Sharing a boundary start-to-end or end-to-start does count as intersection.
        intersectsOrTouchesRange: function(range) {
            return rangesIntersect(this, range, true);
        },

        intersection: function(range) {
            if (this.intersectsRange(range)) {
                var startComparison = dom.comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset),
                    endComparison = dom.comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);

                var intersectionRange = this.cloneRange();
                if (startComparison == -1) {
                    intersectionRange.setStart(range.startContainer, range.startOffset);
                }
                if (endComparison == 1) {
                    intersectionRange.setEnd(range.endContainer, range.endOffset);
                }
                return intersectionRange;
            }
            return null;
        },

        union: function(range) {
            if (this.intersectsOrTouchesRange(range)) {
                var unionRange = this.cloneRange();
                if (dom.comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
                    unionRange.setStart(range.startContainer, range.startOffset);
                }
                if (dom.comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
                    unionRange.setEnd(range.endContainer, range.endOffset);
                }
                return unionRange;
            } else {
                throw new RangeException("Ranges do not intersect");
            }
        },

        containsNode: function(node, allowPartial) {
            if (allowPartial) {
                return this.intersectsNode(node, false);
            } else {
                return this.compareNode(node) == n_i;
            }
        },

        containsNodeContents: function(node) {
            return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, dom.getNodeLength(node)) <= 0;
        },

        containsRange: function(range) {
            var intersection = this.intersection(range);
            return intersection !== null && range.equals(intersection);
        },

        containsNodeText: function(node) {
            var nodeRange = this.cloneRange();
            nodeRange.selectNode(node);
            var textNodes = nodeRange.getNodes([3]);
            if (textNodes.length > 0) {
                nodeRange.setStart(textNodes[0], 0);
                var lastTextNode = textNodes.pop();
                nodeRange.setEnd(lastTextNode, lastTextNode.length);
                var contains = this.containsRange(nodeRange);
                nodeRange.detach();
                return contains;
            } else {
                return this.containsNodeContents(node);
            }
        },

        getNodes: function(nodeTypes, filter) {
            assertRangeValid(this);
            return getNodesInRange(this, nodeTypes, filter);
        },

        getDocument: function() {
            return getRangeDocument(this);
        },

        collapseBefore: function(node) {
            assertNotDetached(this);

            this.setEndBefore(node);
            this.collapse(false);
        },

        collapseAfter: function(node) {
            assertNotDetached(this);

            this.setStartAfter(node);
            this.collapse(true);
        },

        getName: function() {
            return "DomRange";
        },

        equals: function(range) {
            return Range.rangesEqual(this, range);
        },

        isValid: function() {
            return isRangeValid(this);
        },

        inspect: function() {
            return inspect(this);
        }
    };

    function copyComparisonConstantsToObject(obj) {
        obj.START_TO_START = s2s;
        obj.START_TO_END = s2e;
        obj.END_TO_END = e2e;
        obj.END_TO_START = e2s;

        obj.NODE_BEFORE = n_b;
        obj.NODE_AFTER = n_a;
        obj.NODE_BEFORE_AND_AFTER = n_b_a;
        obj.NODE_INSIDE = n_i;
    }

    function copyComparisonConstants(constructor) {
        copyComparisonConstantsToObject(constructor);
        copyComparisonConstantsToObject(constructor.prototype);
    }

    function createRangeContentRemover(remover, boundaryUpdater) {
        return function() {
            assertRangeValid(this);

            var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;

            var iterator = new RangeIterator(this, true);

            // Work out where to position the range after content removal
            var node, boundary;
            if (sc !== root) {
                node = dom.getClosestAncestorIn(sc, root, true);
                boundary = getBoundaryAfterNode(node);
                sc = boundary.node;
                so = boundary.offset;
            }

            // Check none of the range is read-only
            iterateSubtree(iterator, assertNodeNotReadOnly);

            iterator.reset();

            // Remove the content
            var returnValue = remover(iterator);
            iterator.detach();

            // Move to the new position
            boundaryUpdater(this, sc, so, sc, so);

            return returnValue;
        };
    }

    function createPrototypeRange(constructor, boundaryUpdater, detacher) {
        function createBeforeAfterNodeSetter(isBefore, isStart) {
            return function(node) {
                assertNotDetached(this);
                assertValidNodeType(node, beforeAfterNodeTypes);
                assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);

                var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
                (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
            };
        }

        function setRangeStart(range, node, offset) {
            var ec = range.endContainer, eo = range.endOffset;
            if (node !== range.startContainer || offset !== range.startOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(ec) || dom.comparePoints(node, offset, ec, eo) == 1) {
                    ec = node;
                    eo = offset;
                }
                boundaryUpdater(range, node, offset, ec, eo);
            }
        }

        function setRangeEnd(range, node, offset) {
            var sc = range.startContainer, so = range.startOffset;
            if (node !== range.endContainer || offset !== range.endOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(sc) || dom.comparePoints(node, offset, sc, so) == -1) {
                    sc = node;
                    so = offset;
                }
                boundaryUpdater(range, sc, so, node, offset);
            }
        }

        constructor.prototype = new RangePrototype();

        util.extend(constructor.prototype, {
            setStart: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeStart(this, node, offset);
            },

            setEnd: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeEnd(this, node, offset);
            },

            /**
             * Convenience method to set a range's start and end boundaries. Overloaded as follows:
             * - Two parameters (node, offset) creates a collapsed range at that position
             * - three parameters (node, startOffset, endOffset) creates a range contained with node starting at
             *   startOffset and ending at endOffset
             * - Four parameters (startNode, startOffset, endNode, endOffset) creates a range starting at startOffset in
             *   startNode and ending at endOffset in endNode
             */
            setStartAndEnd: function() {
                assertNotDetached(this);

                var args = arguments;
                var sc = args[0], so = args[1], ec = sc, eo = so;

                switch (args.length) {
                    case 3:
                        eo = args[2];
                        break;
                    case 4:
                        ec = args[2];
                        eo = args[3];
                        break;
                }

                boundaryUpdater(this, sc, so, ec, eo);
            },

            setStartBefore: createBeforeAfterNodeSetter(true, true),
            setStartAfter: createBeforeAfterNodeSetter(false, true),
            setEndBefore: createBeforeAfterNodeSetter(true, false),
            setEndAfter: createBeforeAfterNodeSetter(false, false),

            collapse: function(isStart) {
                assertRangeValid(this);
                if (isStart) {
                    boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
                } else {
                    boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
                }
            },

            selectNodeContents: function(node) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);

                boundaryUpdater(this, node, 0, node, dom.getNodeLength(node));
            },

            selectNode: function(node) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, false);
                assertValidNodeType(node, beforeAfterNodeTypes);

                var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
                boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
            },

            extractContents: createRangeContentRemover(extractSubtree, boundaryUpdater),

            deleteContents: createRangeContentRemover(deleteSubtree, boundaryUpdater),

            canSurroundContents: function() {
                assertRangeValid(this);
                assertNodeNotReadOnly(this.startContainer);
                assertNodeNotReadOnly(this.endContainer);

                // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
                // no non-text nodes.
                var iterator = new RangeIterator(this, true);
                var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                        (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
                iterator.detach();
                return !boundariesInvalid;
            },

            detach: function() {
                detacher(this);
            },

            splitBoundaries: function() {
                splitRangeBoundaries(this);
            },

            splitBoundariesPreservingPositions: function(positionsToPreserve) {
                splitRangeBoundaries(this, positionsToPreserve);
            },

            normalizeBoundaries: function() {
                assertRangeValid(this);

                var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;

                var mergeForward = function(node) {
                    var sibling = node.nextSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        ec = node;
                        eo = node.length;
                        node.appendData(sibling.data);
                        sibling.parentNode.removeChild(sibling);
                    }
                };

                var mergeBackward = function(node) {
                    var sibling = node.previousSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        sc = node;
                        var nodeLength = node.length;
                        so = sibling.length;
                        node.insertData(0, sibling.data);
                        sibling.parentNode.removeChild(sibling);
                        if (sc == ec) {
                            eo += so;
                            ec = sc;
                        } else if (ec == node.parentNode) {
                            var nodeIndex = dom.getNodeIndex(node);
                            if (eo == nodeIndex) {
                                ec = node;
                                eo = nodeLength;
                            } else if (eo > nodeIndex) {
                                eo--;
                            }
                        }
                    }
                };

                var normalizeStart = true;

                if (dom.isCharacterDataNode(ec)) {
                    if (ec.length == eo) {
                        mergeForward(ec);
                    }
                } else {
                    if (eo > 0) {
                        var endNode = ec.childNodes[eo - 1];
                        if (endNode && dom.isCharacterDataNode(endNode)) {
                            mergeForward(endNode);
                        }
                    }
                    normalizeStart = !this.collapsed;
                }

                if (normalizeStart) {
                    if (dom.isCharacterDataNode(sc)) {
                        if (so == 0) {
                            mergeBackward(sc);
                        }
                    } else {
                        if (so < sc.childNodes.length) {
                            var startNode = sc.childNodes[so];
                            if (startNode && dom.isCharacterDataNode(startNode)) {
                                mergeBackward(startNode);
                            }
                        }
                    }
                } else {
                    sc = ec;
                    so = eo;
                }

                boundaryUpdater(this, sc, so, ec, eo);
            },

            collapseToPoint: function(node, offset) {
                assertNotDetached(this);
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);
                this.setStartAndEnd(node, offset);
            }
        });

        copyComparisonConstants(constructor);
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // Updates commonAncestorContainer and collapsed after boundary change
    function updateCollapsedAndCommonAncestor(range) {
        range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
        range.commonAncestorContainer = range.collapsed ?
            range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
    }

    function updateBoundaries(range, startContainer, startOffset, endContainer, endOffset) {
        range.startContainer = startContainer;
        range.startOffset = startOffset;
        range.endContainer = endContainer;
        range.endOffset = endOffset;

        updateCollapsedAndCommonAncestor(range);
    }

    function detach(range) {
        assertNotDetached(range);
        range.startContainer = range.startOffset = range.endContainer = range.endOffset = null;
        range.collapsed = range.commonAncestorContainer = null;
    }

    function Range(doc) {
        this.startContainer = doc;
        this.startOffset = 0;
        this.endContainer = doc;
        this.endOffset = 0;
        updateCollapsedAndCommonAncestor(this);
    }

    createPrototypeRange(Range, updateBoundaries, detach);

    api.rangePrototype = RangePrototype.prototype;

    util.extend(Range, {
        rangeProperties: rangeProperties,
        RangeIterator: RangeIterator,
        copyComparisonConstants: copyComparisonConstants,
        createPrototypeRange: createPrototypeRange,
        inspect: inspect,
        getRangeDocument: getRangeDocument,
        rangesEqual: function(r1, r2) {
            return r1.startContainer === r2.startContainer &&
                r1.startOffset === r2.startOffset &&
                r1.endContainer === r2.endContainer &&
                r1.endOffset === r2.endOffset;
        }
    });

    api.DomRange = Range;
    api.RangeException = RangeException;
});
rangy.createModule("WrappedRange", function(api, module) {
    api.requireModules( ["DomUtil", "DomRange"] );

    var WrappedRange;
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DomRange = api.DomRange;


    function getDocument(doc, methodName) {
        doc = dom.getContentDocument(doc);
        if (!doc) {
            throw module.createError(methodName + "(): Parameter must be a Document or other DOM node, or a Window object");
        }
        return doc;
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    /*
    This is a workaround for a bug where IE returns the wrong container element from the TextRange's parentElement()
    method. For example, in the following (where pipes denote the selection boundaries):

    <ul id="ul"><li id="a">| a </li><li id="b"> b |</li></ul>

    var range = document.selection.createRange();
    alert(range.parentElement().id); // Should alert "ul" but alerts "b"

    This method returns the common ancestor node of the following:
    - the parentElement() of the textRange
    - the parentElement() of the textRange after calling collapse(true)
    - the parentElement() of the textRange after calling collapse(false)
     */
    function getTextRangeContainerElement(textRange) {
        var parentEl = textRange.parentElement();
        var range = textRange.duplicate();
        range.collapse(true);
        var startEl = range.parentElement();
        range = textRange.duplicate();
        range.collapse(false);
        var endEl = range.parentElement();
        var startEndContainer = (startEl == endEl) ? startEl : dom.getCommonAncestor(startEl, endEl);

        return startEndContainer == parentEl ? startEndContainer : dom.getCommonAncestor(parentEl, startEndContainer);
    }

    function textRangeIsCollapsed(textRange) {
        return textRange.compareEndPoints("StartToEnd", textRange) == 0;
    }

    // Gets the boundary of a TextRange expressed as a node and an offset within that node. This function started out as
    // an improved version of code found in Tim Cameron Ryan's IERange (http://code.google.com/p/ierange/) but has
    // grown, fixing problems with line breaks in preformatted text, adding workaround for IE TextRange bugs, handling
    // for inputs and images, plus optimizations.
    function getTextRangeBoundaryPosition(textRange, wholeRangeContainerElement, isStart, isCollapsed, startInfo) {
        var workingRange = textRange.duplicate();

        workingRange.collapse(isStart);
        var containerElement = workingRange.parentElement();

        // Sometimes collapsing a TextRange that's at the start of a text node can move it into the previous node, so
        // check for that
        if (!dom.isOrIsAncestorOf(wholeRangeContainerElement, containerElement)) {
            containerElement = wholeRangeContainerElement;
        }


        // Deal with nodes that cannot "contain rich HTML markup". In practice, this means form inputs, images and
        // similar. See http://msdn.microsoft.com/en-us/library/aa703950%28VS.85%29.aspx
        if (!containerElement.canHaveHTML) {
            return new DomPosition(containerElement.parentNode, dom.getNodeIndex(containerElement));
        }

        var workingNode = dom.getDocument(containerElement).createElement("span");

        // Workaround for HTML5 Shiv's insane violation of document.createElement(). See Rangy issue 104 and HTML 5 Shiv
        // issue 64: https://github.com/aFarkas/html5shiv/issues/64
        if (workingNode.parentNode) {
            workingNode.parentNode.removeChild(workingNode);
        }

        var comparison, workingComparisonType = isStart ? "StartToStart" : "StartToEnd";
        var previousNode, nextNode, boundaryPosition, boundaryNode;
        var start = (startInfo && startInfo.containerElement == containerElement) ? startInfo.nodeIndex : 0;
        var childNodeCount = containerElement.childNodes.length;
        var end = childNodeCount;

        // Check end first. Code within the loop assumes that the endth child node of the container is definitely
        // after the range boundary.
        var nodeIndex = end;

        while (true) {
            if (nodeIndex == childNodeCount) {
                containerElement.appendChild(workingNode);
            } else {
                containerElement.insertBefore(workingNode, containerElement.childNodes[nodeIndex]);
            }
            workingRange.moveToElementText(workingNode);
            comparison = workingRange.compareEndPoints(workingComparisonType, textRange);
            if (comparison == 0 || start == end) {
                break;
            } else if (comparison == -1) {
                if (end == start + 1) {
                    // We know the endth child node is after the range boundary, so we must be done.
                    break;
                } else {
                    start = nodeIndex
                }
            } else {
                end = (end == start + 1) ? start : nodeIndex;
            }
            nodeIndex = Math.floor((start + end) / 2);
            containerElement.removeChild(workingNode);
        }


        // We've now reached or gone past the boundary of the text range we're interested in
        // so have identified the node we want
        boundaryNode = workingNode.nextSibling;

        if (comparison == -1 && boundaryNode && dom.isCharacterDataNode(boundaryNode)) {
            // This is a character data node (text, comment, cdata). The working range is collapsed at the start of the
            // node containing the text range's boundary, so we move the end of the working range to the boundary point
            // and measure the length of its text to get the boundary's offset within the node.
            workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);

            var offset;

            if (/[\r\n]/.test(boundaryNode.data)) {
                /*
                For the particular case of a boundary within a text node containing rendered line breaks (within a <pre>
                element, for example), we need a slightly complicated approach to get the boundary's offset in IE. The
                facts:

                - Each line break is represented as \r in the text node's data/nodeValue properties
                - Each line break is represented as \r\n in the TextRange's 'text' property
                - The 'text' property of the TextRange does not contain trailing line breaks

                To get round the problem presented by the final fact above, we can use the fact that TextRange's
                moveStart() and moveEnd() methods return the actual number of characters moved, which is not necessarily
                the same as the number of characters it was instructed to move. The simplest approach is to use this to
                store the characters moved when moving both the start and end of the range to the start of the document
                body and subtracting the start offset from the end offset (the "move-negative-gazillion" method).
                However, this is extremely slow when the document is large and the range is near the end of it. Clearly
                doing the mirror image (i.e. moving the range boundaries to the end of the document) has the same
                problem.

                Another approach that works is to use moveStart() to move the start boundary of the range up to the end
                boundary one character at a time and incrementing a counter with the value returned by the moveStart()
                call. However, the check for whether the start boundary has reached the end boundary is expensive, so
                this method is slow (although unlike "move-negative-gazillion" is largely unaffected by the location of
                the range within the document).

                The method below is a hybrid of the two methods above. It uses the fact that a string containing the
                TextRange's 'text' property with each \r\n converted to a single \r character cannot be longer than the
                text of the TextRange, so the start of the range is moved that length initially and then a character at
                a time to make up for any trailing line breaks not contained in the 'text' property. This has good
                performance in most situations compared to the previous two methods.
                */
                var tempRange = workingRange.duplicate();
                var rangeLength = tempRange.text.replace(/\r\n/g, "\r").length;

                offset = tempRange.moveStart("character", rangeLength);
                while ( (comparison = tempRange.compareEndPoints("StartToEnd", tempRange)) == -1) {
                    offset++;
                    tempRange.moveStart("character", 1);
                }
            } else {
                offset = workingRange.text.length;
            }
            boundaryPosition = new DomPosition(boundaryNode, offset);
        } else {

            // If the boundary immediately follows a character data node and this is the end boundary, we should favour
            // a position within that, and likewise for a start boundary preceding a character data node
            previousNode = (isCollapsed || !isStart) && workingNode.previousSibling;
            nextNode = (isCollapsed || isStart) && workingNode.nextSibling;
            if (nextNode && dom.isCharacterDataNode(nextNode)) {
                boundaryPosition = new DomPosition(nextNode, 0);
            } else if (previousNode && dom.isCharacterDataNode(previousNode)) {
                boundaryPosition = new DomPosition(previousNode, previousNode.data.length);
            } else {
                boundaryPosition = new DomPosition(containerElement, dom.getNodeIndex(workingNode));
            }
        }

        // Clean up
        workingNode.parentNode.removeChild(workingNode);

        return {
            boundaryPosition: boundaryPosition,
            nodeInfo: {
                nodeIndex: nodeIndex,
                containerElement: containerElement
            }
        };
    }

    // Returns a TextRange representing the boundary of a TextRange expressed as a node and an offset within that node.
    // This function started out as an optimized version of code found in Tim Cameron Ryan's IERange
    // (http://code.google.com/p/ierange/)
    function createBoundaryTextRange(boundaryPosition, isStart) {
        var boundaryNode, boundaryParent, boundaryOffset = boundaryPosition.offset;
        var doc = dom.getDocument(boundaryPosition.node);
        var workingNode, childNodes, workingRange = doc.body.createTextRange();
        var nodeIsDataNode = dom.isCharacterDataNode(boundaryPosition.node);

        if (nodeIsDataNode) {
            boundaryNode = boundaryPosition.node;
            boundaryParent = boundaryNode.parentNode;
        } else {
            childNodes = boundaryPosition.node.childNodes;
            boundaryNode = (boundaryOffset < childNodes.length) ? childNodes[boundaryOffset] : null;
            boundaryParent = boundaryPosition.node;
        }

        // Position the range immediately before the node containing the boundary
        workingNode = doc.createElement("span");

        // Making the working element non-empty element persuades IE to consider the TextRange boundary to be within the
        // element rather than immediately before or after it
        workingNode.innerHTML = "&#feff;";

        // insertBefore is supposed to work like appendChild if the second parameter is null. However, a bug report
        // for IERange suggests that it can crash the browser: http://code.google.com/p/ierange/issues/detail?id=12
        if (boundaryNode) {
            boundaryParent.insertBefore(workingNode, boundaryNode);
        } else {
            boundaryParent.appendChild(workingNode);
        }

        workingRange.moveToElementText(workingNode);
        workingRange.collapse(!isStart);

        // Clean up
        boundaryParent.removeChild(workingNode);

        // Move the working range to the text offset, if required
        if (nodeIsDataNode) {
            workingRange[isStart ? "moveStart" : "moveEnd"]("character", boundaryOffset);
        }

        return workingRange;
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    if (api.features.implementsDomRange && (!api.features.implementsTextRange || !api.config.preferTextRange)) {
        // This is a wrapper around the browser's native DOM Range. It has two aims:
        // - Provide workarounds for specific browser bugs
        // - provide convenient extensions, which are inherited from Rangy's DomRange

        (function() {
            var rangeProto;
            var rangeProperties = DomRange.rangeProperties;

            function updateRangeProperties(range) {
                var i = rangeProperties.length, prop;
                while (i--) {
                    prop = rangeProperties[i];
                    range[prop] = range.nativeRange[prop];
                }
                // Fix for broken collapsed property in IE 9.
                range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
            }

            function updateNativeRange(range, startContainer, startOffset, endContainer, endOffset) {
                var startMoved = (range.startContainer !== startContainer || range.startOffset != startOffset);
                var endMoved = (range.endContainer !== endContainer || range.endOffset != endOffset);
                var nativeRangeDifferent = !range.equals(range.nativeRange);

                // Always set both boundaries for the benefit of IE9 (see issue 35)
                if (startMoved || endMoved || nativeRangeDifferent) {
                    range.setEnd(endContainer, endOffset);
                    range.setStart(startContainer, startOffset);
                }
            }

            function detach(range) {
                range.nativeRange.detach();
                range.detached = true;
                var i = rangeProperties.length, prop;
                while (i--) {
                    prop = rangeProperties[i];
                    range[prop] = null;
                }
            }

            var createBeforeAfterNodeSetter;

            WrappedRange = function(range) {
                if (!range) {
                    throw module.createError("WrappedRange: Range must be specified");
                }
                this.nativeRange = range;
                updateRangeProperties(this);
            };

            DomRange.createPrototypeRange(WrappedRange, updateNativeRange, detach);

            rangeProto = WrappedRange.prototype;

            rangeProto.selectNode = function(node) {
                this.nativeRange.selectNode(node);
                updateRangeProperties(this);
            };

            rangeProto.cloneContents = function() {
                return this.nativeRange.cloneContents();
            };

            // Firefox has a bug (apparently long-standing, still present in 3.6.8) that throws "Index or size is
            // negative or greater than the allowed amount" for insertNode in some circumstances. I haven't been able to
            // find a reliable way of detecting this, so all browsers will have to use the Rangy's own implementation of
            // insertNode, which works but is almost certainly slower than the native implementation.
/*
            rangeProto.insertNode = function(node) {
                this.nativeRange.insertNode(node);
                updateRangeProperties(this);
            };
*/

            rangeProto.surroundContents = function(node) {
                this.nativeRange.surroundContents(node);
                updateRangeProperties(this);
            };

            rangeProto.collapse = function(isStart) {
                this.nativeRange.collapse(isStart);
                updateRangeProperties(this);
            };

            rangeProto.cloneRange = function() {
                return new WrappedRange(this.nativeRange.cloneRange());
            };

            rangeProto.refresh = function() {
                updateRangeProperties(this);
            };

            rangeProto.toString = function() {
                return this.nativeRange.toString();
            };

            // Create test range and node for feature detection

            var testTextNode = document.createTextNode("test");
            dom.getBody(document).appendChild(testTextNode);
            var range = document.createRange();

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for Firefox 2 bug that prevents moving the start of a Range to a point after its current end and
            // correct for it

            range.setStart(testTextNode, 0);
            range.setEnd(testTextNode, 0);

            try {
                range.setStart(testTextNode, 1);

                rangeProto.setStart = function(node, offset) {
                    this.nativeRange.setStart(node, offset);
                    updateRangeProperties(this);
                };

                rangeProto.setEnd = function(node, offset) {
                    this.nativeRange.setEnd(node, offset);
                    updateRangeProperties(this);
                };

                createBeforeAfterNodeSetter = function(name) {
                    return function(node) {
                        this.nativeRange[name](node);
                        updateRangeProperties(this);
                    };
                };

            } catch(ex) {

                rangeProto.setStart = function(node, offset) {
                    try {
                        this.nativeRange.setStart(node, offset);
                    } catch (ex) {
                        this.nativeRange.setEnd(node, offset);
                        this.nativeRange.setStart(node, offset);
                    }
                    updateRangeProperties(this);
                };

                rangeProto.setEnd = function(node, offset) {
                    try {
                        this.nativeRange.setEnd(node, offset);
                    } catch (ex) {
                        this.nativeRange.setStart(node, offset);
                        this.nativeRange.setEnd(node, offset);
                    }
                    updateRangeProperties(this);
                };

                createBeforeAfterNodeSetter = function(name, oppositeName) {
                    return function(node) {
                        try {
                            this.nativeRange[name](node);
                        } catch (ex) {
                            this.nativeRange[oppositeName](node);
                            this.nativeRange[name](node);
                        }
                        updateRangeProperties(this);
                    };
                };
            }

            rangeProto.setStartBefore = createBeforeAfterNodeSetter("setStartBefore", "setEndBefore");
            rangeProto.setStartAfter = createBeforeAfterNodeSetter("setStartAfter", "setEndAfter");
            rangeProto.setEndBefore = createBeforeAfterNodeSetter("setEndBefore", "setStartBefore");
            rangeProto.setEndAfter = createBeforeAfterNodeSetter("setEndAfter", "setStartAfter");

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for and correct Firefox 2 behaviour with selectNodeContents on text nodes: it collapses the range to
            // the 0th character of the text node
            range.selectNodeContents(testTextNode);
            if (range.startContainer == testTextNode && range.endContainer == testTextNode &&
                    range.startOffset == 0 && range.endOffset == testTextNode.length) {
                rangeProto.selectNodeContents = function(node) {
                    this.nativeRange.selectNodeContents(node);
                    updateRangeProperties(this);
                };
            } else {
                rangeProto.selectNodeContents = function(node) {
                    this.setStart(node, 0);
                    this.setEnd(node, DomRange.getEndOffset(node));
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for and correct WebKit bug that has the behaviour of compareBoundaryPoints round the wrong way for
            // constants START_TO_END and END_TO_START: https://bugs.webkit.org/show_bug.cgi?id=20738

            range.selectNodeContents(testTextNode);
            range.setEnd(testTextNode, 3);

            var range2 = document.createRange();
            range2.selectNodeContents(testTextNode);
            range2.setEnd(testTextNode, 4);
            range2.setStart(testTextNode, 2);

            if (range.compareBoundaryPoints(range.START_TO_END, range2) == -1 &&
                    range.compareBoundaryPoints(range.END_TO_START, range2) == 1) {
                // This is the wrong way round, so correct for it

                rangeProto.compareBoundaryPoints = function(type, range) {
                    range = range.nativeRange || range;
                    if (type == range.START_TO_END) {
                        type = range.END_TO_START;
                    } else if (type == range.END_TO_START) {
                        type = range.START_TO_END;
                    }
                    return this.nativeRange.compareBoundaryPoints(type, range);
                };
            } else {
                rangeProto.compareBoundaryPoints = function(type, range) {
                    return this.nativeRange.compareBoundaryPoints(type, range.nativeRange || range);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for IE 9 deleteContents() and extractContents() bug and correct it. See issue 107.

            var el = document.createElement("div");
            el.innerHTML = "123";
            var textNode = el.firstChild;
            document.body.appendChild(el);

            range.setStart(textNode, 1);
            range.setEnd(textNode, 2);
            range.deleteContents();

            if (textNode.data == "13") {
                // Behaviour is correct per DOM4 Range so wrap the browser's implementation of deleteContents() and
                // extractContents()
                rangeProto.deleteContents = function() {
                    this.nativeRange.deleteContents();
                    updateRangeProperties(this);
                };

                rangeProto.extractContents = function() {
                    var frag = this.nativeRange.extractContents();
                    updateRangeProperties(this);
                    return frag;
                };
            } else {
            }

            document.body.removeChild(el);

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for existence of createContextualFragment and delegate to it if it exists
            if (util.isHostMethod(range, "createContextualFragment")) {
                rangeProto.createContextualFragment = function(fragmentStr) {
                    return this.nativeRange.createContextualFragment(fragmentStr);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Clean up
            dom.getBody(document).removeChild(testTextNode);
            range.detach();
            range2.detach();
        })();

        api.createNativeRange = function(doc) {
            doc = getDocument(doc, "createNativeRange");
            return doc.createRange();
        };
    } else if (api.features.implementsTextRange) {
        // This is a wrapper around a TextRange, providing full DOM Range functionality using rangy's DomRange as a
        // prototype

        WrappedRange = function(textRange) {
            this.textRange = textRange;
            this.refresh();
        };

        WrappedRange.prototype = new DomRange(document);

        WrappedRange.prototype.refresh = function() {
            var start, end, startBoundary;

            // TextRange's parentElement() method cannot be trusted. getTextRangeContainerElement() works around that.
            var rangeContainerElement = getTextRangeContainerElement(this.textRange);

            if (textRangeIsCollapsed(this.textRange)) {
                end = start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true,
                    true).boundaryPosition;
            } else {
                startBoundary = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, false);
                start = startBoundary.boundaryPosition;

                // An optimization used here is that if the start and end boundaries have teh same parent element, the
                // search scope for the end boundary can be limited to exclude the portion of the element that precedes
                // the start boundary
                end = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, false, false,
                    startBoundary.nodeInfo).boundaryPosition;
            }

            this.setStart(start.node, start.offset);
            this.setEnd(end.node, end.offset);
        };

        DomRange.copyComparisonConstants(WrappedRange);

        // Add WrappedRange as the Range property of the global object to allow expression like Range.END_TO_END to work
        var globalObj = (function() { return this; })();
        if (typeof globalObj.Range == "undefined") {
            globalObj.Range = WrappedRange;
        }

        api.createNativeRange = function(doc) {
            doc = getDocument(doc, "createNativeRange");
            return doc.body.createTextRange();
        };
    }

    if (api.features.implementsTextRange) {
        WrappedRange.rangeToTextRange = function(range) {
            if (range.collapsed) {
                return createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
            } else {
                var startRange = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
                var endRange = createBoundaryTextRange(new DomPosition(range.endContainer, range.endOffset), false);
                var textRange = dom.getDocument(range.startContainer).body.createTextRange();
                textRange.setEndPoint("StartToStart", startRange);
                textRange.setEndPoint("EndToEnd", endRange);
                return textRange;
            }
        };
    }

    WrappedRange.prototype.getName = function() {
        return "WrappedRange";
    };

    api.WrappedRange = WrappedRange;

    api.createRange = function(doc) {
        doc = getDocument(doc, "createRange");
        return new WrappedRange(api.createNativeRange(doc));
    };

    api.createRangyRange = function(doc) {
        doc = getDocument(doc, "createRangyRange");
        return new DomRange(doc);
    };

    api.createIframeRange = function(iframeEl) {
        module.deprecationNotice("createIframeRange()", "createRange(iframeEl)");
        return api.createRange(iframeEl);
    };

    api.createIframeRangyRange = function(iframeEl) {
        module.deprecationNotice("createIframeRangyRange()", "createRangyRange(iframeEl)");
        return api.createRangyRange(iframeEl);
    };

    api.addCreateMissingNativeApiListener(function(win) {
        var doc = win.document;
        if (typeof doc.createRange == "undefined") {
            doc.createRange = function() {
                return api.createRange(doc);
            };
        }
        doc = win = null;
    });
});
// This module creates a selection object wrapper that conforms as closely as possible to the Selection specification
// in the HTML Editing spec (http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections)
rangy.createModule("WrappedSelection", function(api, module) {
    api.requireModules( ["DomUtil", "DomRange", "WrappedRange"] );

    api.config.checkSelectionRanges = true;

    var BOOLEAN = "boolean",
        dom = api.dom,
        util = api.util,
        DomRange = api.DomRange,
        WrappedRange = api.WrappedRange,
        DOMException = api.DOMException,
        DomPosition = dom.DomPosition,
        getSelection,
        selectionIsCollapsed,
        CONTROL = "Control";


    // Utility function to support direction parameters in the API that may be a string ("backward" or "forward") or a
    // Boolean (true for backwards).
    function isDirectionBackward(dir) {
        return (typeof dir == "string") ? (dir == "backward") : !!dir;
    }

    function getWindow(win, methodName) {
        if (!win) {
            return window;
        } else if (dom.isWindow(win)) {
            return win;
        } else if (win instanceof WrappedSelection) {
            return win.win;
        } else {
            var doc = dom.getContentDocument(win);
            if (!doc) {
                throw module.createError(methodName + "(): " + "Parameter must be a Window object or DOM node");
            }
            return dom.getWindow(doc);
        }
    }

    function getWinSelection(winParam) {
        return getWindow(winParam, "getWinSelection").getSelection();
    }

    function getDocSelection(winParam) {
        return getWindow(winParam, "getDocSelection").document.selection;
    }

    // Test for the Range/TextRange and Selection features required
    // Test for ability to retrieve selection
    var implementsWinGetSelection = api.util.isHostMethod(window, "getSelection"),
        implementsDocSelection = api.util.isHostObject(document, "selection");

    api.features.implementsWinGetSelection = implementsWinGetSelection;
    api.features.implementsDocSelection = implementsDocSelection;

    var useDocumentSelection = implementsDocSelection && (!implementsWinGetSelection || api.config.preferTextRange);

    if (useDocumentSelection) {
        getSelection = getDocSelection;
        api.isSelectionValid = function(winParam) {
            var doc = getWindow(winParam, "isSelectionValid").document, nativeSel = doc.selection;

            // Check whether the selection TextRange is actually contained within the correct document
            return (nativeSel.type != "None" || dom.getDocument(nativeSel.createRange().parentElement()) == doc);
        };
    } else if (implementsWinGetSelection) {
        getSelection = getWinSelection;
        api.isSelectionValid = function() {
            return true;
        };
    } else {
        module.fail("Neither document.selection or window.getSelection() detected.");
    }

    api.getNativeSelection = getSelection;

    var testSelection = getSelection();
    var testRange = api.createNativeRange(document);
    var body = dom.getBody(document);

    // Obtaining a range from a selection
    var selectionHasAnchorAndFocus = util.areHostProperties(testSelection,
        ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);

    api.features.selectionHasAnchorAndFocus = selectionHasAnchorAndFocus;

    // Test for existence of native selection extend() method
    var selectionHasExtend = util.isHostMethod(testSelection, "extend");
    api.features.selectionHasExtend = selectionHasExtend;

    // Test if rangeCount exists
    var selectionHasRangeCount = (typeof testSelection.rangeCount == "number");
    api.features.selectionHasRangeCount = selectionHasRangeCount;

    var selectionSupportsMultipleRanges = false;
    var collapsedNonEditableSelectionsSupported = true;

    if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) &&
            typeof testSelection.rangeCount == "number" && api.features.implementsDomRange) {

        (function() {
            // Previously an iframe was used but this caused problems in some circumatsances in IE, so tests are
            // performed on the current document's selection. See issue 109.

            // Note also that if a selection previously existed, it is wiped by these tests. This should usually be fine
            // because initialization usually happens when the document loads, but could be a problem for a script that
            // loads and initializes Rangy later. If anyone complains, code could be added to the selection could be
            // saved and restored.
            var sel = window.getSelection();
            if (sel) {
                var body = dom.getBody(document);
                var testEl = body.appendChild( document.createElement("div") );
                testEl.contentEditable = "false";
                var textNode = testEl.appendChild( document.createTextNode("\u00a0\u00a0\u00a0") );

                // Test whether the native selection will allow a collapsed selection within a non-editable element
                var r1 = document.createRange();

                r1.setStart(textNode, 1);
                r1.collapse(true);
                sel.addRange(r1);
                collapsedNonEditableSelectionsSupported = (sel.rangeCount == 1);
                sel.removeAllRanges();

                // Test whether the native selection is capable of supporting multiple ranges
                var r2 = r1.cloneRange();
                r1.setStart(textNode, 0);
                r2.setEnd(textNode, 3);
                r2.setStart(textNode, 2);
                sel.addRange(r1);
                sel.addRange(r2);

                selectionSupportsMultipleRanges = (sel.rangeCount == 2);

                // Clean up
                body.removeChild(testEl);
                sel.removeAllRanges();
                r1.detach();
                r2.detach();
            }
        })();
    }

    api.features.selectionSupportsMultipleRanges = selectionSupportsMultipleRanges;
    api.features.collapsedNonEditableSelectionsSupported = collapsedNonEditableSelectionsSupported;

    // ControlRanges
    var implementsControlRange = false, testControlRange;

    if (body && util.isHostMethod(body, "createControlRange")) {
        testControlRange = body.createControlRange();
        if (util.areHostProperties(testControlRange, ["item", "add"])) {
            implementsControlRange = true;
        }
    }
    api.features.implementsControlRange = implementsControlRange;

    // Selection collapsedness
    if (selectionHasAnchorAndFocus) {
        selectionIsCollapsed = function(sel) {
            return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
        };
    } else {
        selectionIsCollapsed = function(sel) {
            return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
        };
    }

    function updateAnchorAndFocusFromRange(sel, range, backward) {
        var anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
        sel.anchorNode = range[anchorPrefix + "Container"];
        sel.anchorOffset = range[anchorPrefix + "Offset"];
        sel.focusNode = range[focusPrefix + "Container"];
        sel.focusOffset = range[focusPrefix + "Offset"];
    }

    function updateAnchorAndFocusFromNativeSelection(sel) {
        var nativeSel = sel.nativeSelection;
        sel.anchorNode = nativeSel.anchorNode;
        sel.anchorOffset = nativeSel.anchorOffset;
        sel.focusNode = nativeSel.focusNode;
        sel.focusOffset = nativeSel.focusOffset;
    }

    function updateEmptySelection(sel) {
        sel.anchorNode = sel.focusNode = null;
        sel.anchorOffset = sel.focusOffset = 0;
        sel.rangeCount = 0;
        sel.isCollapsed = true;
        sel._ranges.length = 0;
    }

    function getNativeRange(range) {
        var nativeRange;
        if (range instanceof DomRange) {
            nativeRange = api.createNativeRange(range.getDocument());
            nativeRange.setEnd(range.endContainer, range.endOffset);
            nativeRange.setStart(range.startContainer, range.startOffset);
        } else if (range instanceof WrappedRange) {
            nativeRange = range.nativeRange;
        } else if (api.features.implementsDomRange && (range instanceof dom.getWindow(range.startContainer).Range)) {
            nativeRange = range;
        }
        return nativeRange;
    }

    function rangeContainsSingleElement(rangeNodes) {
        if (!rangeNodes.length || rangeNodes[0].nodeType != 1) {
            return false;
        }
        for (var i = 1, len = rangeNodes.length; i < len; ++i) {
            if (!dom.isAncestorOf(rangeNodes[0], rangeNodes[i])) {
                return false;
            }
        }
        return true;
    }

    function getSingleElementFromRange(range) {
        var nodes = range.getNodes();
        if (!rangeContainsSingleElement(nodes)) {
            throw module.createError("getSingleElementFromRange: range " + range.inspect() + " did not consist of a single element");
        }
        return nodes[0];
    }

    // Simple, quick test which only needs to distinguish between a TextRange and a ControlRange
    function isTextRange(range) {
        return !!range && typeof range.text != "undefined";
    }

    function updateFromTextRange(sel, range) {
        // Create a Range from the selected TextRange
        var wrappedRange = new WrappedRange(range);
        sel._ranges = [wrappedRange];

        updateAnchorAndFocusFromRange(sel, wrappedRange, false);
        sel.rangeCount = 1;
        sel.isCollapsed = wrappedRange.collapsed;
    }

    function updateControlSelection(sel) {
        // Update the wrapped selection based on what's now in the native selection
        sel._ranges.length = 0;
        if (sel.docSelection.type == "None") {
            updateEmptySelection(sel);
        } else {
            var controlRange = sel.docSelection.createRange();
            if (isTextRange(controlRange)) {
                // This case (where the selection type is "Control" and calling createRange() on the selection returns
                // a TextRange) can happen in IE 9. It happens, for example, when all elements in the selected
                // ControlRange have been removed from the ControlRange and removed from the document.
                updateFromTextRange(sel, controlRange);
            } else {
                sel.rangeCount = controlRange.length;
                var range, doc = dom.getDocument(controlRange.item(0));
                for (var i = 0; i < sel.rangeCount; ++i) {
                    range = api.createRange(doc);
                    range.selectNode(controlRange.item(i));
                    sel._ranges.push(range);
                }
                sel.isCollapsed = sel.rangeCount == 1 && sel._ranges[0].collapsed;
                updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
            }
        }
    }

    function addRangeToControlSelection(sel, range) {
        var controlRange = sel.docSelection.createRange();
        var rangeElement = getSingleElementFromRange(range);

        // Create a new ControlRange containing all the elements in the selected ControlRange plus the element
        // contained by the supplied range
        var doc = dom.getDocument(controlRange.item(0));
        var newControlRange = dom.getBody(doc).createControlRange();
        for (var i = 0, len = controlRange.length; i < len; ++i) {
            newControlRange.add(controlRange.item(i));
        }
        try {
            newControlRange.add(rangeElement);
        } catch (ex) {
            throw module.createError("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");
        }
        newControlRange.select();

        // Update the wrapped selection based on what's now in the native selection
        updateControlSelection(sel);
    }

    var getSelectionRangeAt;

    if (util.isHostMethod(testSelection, "getRangeAt")) {
        // try/catch is present because getRangeAt() must have thrown an error in some browser and some situation.
        // Unfortunately, I didn't write a comment about the specifics and am now scared to take it out. Let that be a
        // lesson to us all, especially me.
        getSelectionRangeAt = function(sel, index) {
            try {
                return sel.getRangeAt(index);
            } catch (ex) {
                return null;
            }
        };
    } else if (selectionHasAnchorAndFocus) {
        getSelectionRangeAt = function(sel) {
            var doc = dom.getDocument(sel.anchorNode);
            var range = api.createRange(doc);
            range.setStart(sel.anchorNode, sel.anchorOffset);
            range.setEnd(sel.focusNode, sel.focusOffset);

            // Handle the case when the selection was selected backwards (from the end to the start in the
            // document)
            if (range.collapsed !== this.isCollapsed) {
                range.setStart(sel.focusNode, sel.focusOffset);
                range.setEnd(sel.anchorNode, sel.anchorOffset);
            }

            return range;
        };
    }

    function WrappedSelection(selection, docSelection, win) {
        this.nativeSelection = selection;
        this.docSelection = docSelection;
        this._ranges = [];
        this.win = win;
        this.refresh();
    }

    function deleteProperties(sel) {
        sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
        sel.detached = true;
    }

    var cachedRangySelections = [];

    function findCachedSelection(win, action) {
        var i = cachedRangySelections.length, cached, sel;
        while (i--) {
            cached = cachedRangySelections[i];
            sel = cached.selection;
            if (action == "deleteAll") {
                deleteProperties(sel);
            } else if (cached.win == win) {
                if (action == "delete") {
                    cachedRangySelections.splice(i, 1);
                    return true;
                } else {
                    return sel;
                }
            }
        }
        if (action == "deleteAll") {
            cachedRangySelections.length = 0;
        }
        return null;
    }

    api.getSelection = function(win) {
        // Check if the paraemter is a Rangy Selection object
        if (win && win instanceof WrappedSelection) {
            win.refresh();
            return win;
        }

        win = getWindow(win, "getSelection");

        var sel = findCachedSelection(win);
        var nativeSel = getSelection(win), docSel = implementsDocSelection ? getDocSelection(win) : null;
        if (sel) {
            sel.nativeSelection = nativeSel;
            sel.docSelection = docSel;
            sel.refresh();
        } else {
            sel = new WrappedSelection(nativeSel, docSel, win);
            cachedRangySelections.push( { win: win, selection: sel } );
        }
        return sel;
    };

    api.getIframeSelection = function(iframeEl) {
        module.deprecationNotice("getIframeSelection()", "getSelection(iframeEl)");
        return api.getSelection(dom.getIframeWindow(iframeEl));
    };

    var selProto = WrappedSelection.prototype;

    function createControlSelection(sel, ranges) {
        // Ensure that the selection becomes of type "Control"
        var doc = dom.getDocument(ranges[0].startContainer);
        var controlRange = dom.getBody(doc).createControlRange();
        for (var i = 0, el; i < rangeCount; ++i) {
            el = getSingleElementFromRange(ranges[i]);
            try {
                controlRange.add(el);
            } catch (ex) {
                throw module.createError("setRanges(): Element within the one of the specified Ranges could not be added to control selection (does it have layout?)");
            }
        }
        controlRange.select();

        // Update the wrapped selection based on what's now in the native selection
        updateControlSelection(sel);
    }

    // Selecting a range
    if (!useDocumentSelection && selectionHasAnchorAndFocus && util.areHostMethods(testSelection, ["removeAllRanges", "addRange"])) {
        selProto.removeAllRanges = function() {
            this.nativeSelection.removeAllRanges();
            updateEmptySelection(this);
        };

        var addRangeBackward = function(sel, range) {
            var doc = DomRange.getRangeDocument(range);
            var endRange = api.createRange(doc);
            endRange.collapseToPoint(range.endContainer, range.endOffset);
            sel.nativeSelection.addRange(getNativeRange(endRange));
            sel.nativeSelection.extend(range.startContainer, range.startOffset);
            sel.refresh();
        };

        if (selectionHasRangeCount) {
            selProto.addRange = function(range, direction) {
                if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
                    addRangeToControlSelection(this, range);
                } else {
                    if (isDirectionBackward(direction) && selectionHasExtend) {
                        addRangeBackward(this, range);
                    } else {
                        var previousRangeCount;
                        if (selectionSupportsMultipleRanges) {
                            previousRangeCount = this.rangeCount;
                        } else {
                            this.removeAllRanges();
                            previousRangeCount = 0;
                        }
                        // Clone the native range so that changing the selected range does not affect the selection.
                        // This is contrary to the spec but is the only way to achieve consistency between browsers. See
                        // issue 80.
                        this.nativeSelection.addRange(getNativeRange(range).cloneRange());

                        // Check whether adding the range was successful
                        this.rangeCount = this.nativeSelection.rangeCount;

                        if (this.rangeCount == previousRangeCount + 1) {
                            // The range was added successfully

                            // Check whether the range that we added to the selection is reflected in the last range extracted from
                            // the selection
                            if (api.config.checkSelectionRanges) {
                                var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
                                if (nativeRange && !DomRange.rangesEqual(nativeRange, range)) {
                                    // Happens in WebKit with, for example, a selection placed at the start of a text node
                                    range = new WrappedRange(nativeRange);
                                }
                            }
                            this._ranges[this.rangeCount - 1] = range;
                            updateAnchorAndFocusFromRange(this, range, selectionIsBackward(this.nativeSelection));
                            this.isCollapsed = selectionIsCollapsed(this);
                        } else {
                            // The range was not added successfully. The simplest thing is to refresh
                            this.refresh();
                        }
                    }
                }
            };
        } else {
            selProto.addRange = function(range, direction) {
                if (isDirectionBackward(direction) && selectionHasExtend) {
                    addRangeBackward(this, range);
                } else {
                    this.nativeSelection.addRange(getNativeRange(range));
                    this.refresh();
                }
            };
        }

        selProto.setRanges = function(ranges) {
            if (implementsControlRange && ranges.length > 1) {
                createControlSelection(this, ranges);
            } else {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    this.addRange(ranges[i]);
                }
            }
        };
    } else if (util.isHostMethod(testSelection, "empty") && util.isHostMethod(testRange, "select") &&
               implementsControlRange && useDocumentSelection) {

        selProto.removeAllRanges = function() {
            // Added try/catch as fix for issue #21
            try {
                this.docSelection.empty();

                // Check for empty() not working (issue #24)
                if (this.docSelection.type != "None") {
                    // Work around failure to empty a control selection by instead selecting a TextRange and then
                    // calling empty()
                    var doc;
                    if (this.anchorNode) {
                        doc = dom.getDocument(this.anchorNode);
                    } else if (this.docSelection.type == CONTROL) {
                        var controlRange = this.docSelection.createRange();
                        if (controlRange.length) {
                            doc = dom.getDocument(controlRange.item(0)).body.createTextRange();
                        }
                    }
                    if (doc) {
                        var textRange = doc.body.createTextRange();
                        textRange.select();
                        this.docSelection.empty();
                    }
                }
            } catch(ex) {}
            updateEmptySelection(this);
        };

        selProto.addRange = function(range) {
            if (this.docSelection.type == CONTROL) {
                addRangeToControlSelection(this, range);
            } else {
                WrappedRange.rangeToTextRange(range).select();
                this._ranges[0] = range;
                this.rangeCount = 1;
                this.isCollapsed = this._ranges[0].collapsed;
                updateAnchorAndFocusFromRange(this, range, false);
            }
        };

        selProto.setRanges = function(ranges) {
            this.removeAllRanges();
            var rangeCount = ranges.length;
            if (rangeCount > 1) {
                createControlSelection(this, ranges);
            } else if (rangeCount) {
                this.addRange(ranges[0]);
            }
        };
    } else {
        module.fail("No means of selecting a Range or TextRange was found");
        return false;
    }

    selProto.getRangeAt = function(index) {
        if (index < 0 || index >= this.rangeCount) {
            throw new DOMException("INDEX_SIZE_ERR");
        } else {
            // Clone the range to preserve selection-range independence. See issue 80.
            return this._ranges[index].cloneRange();
        }
    };

    var refreshSelection;

    if (useDocumentSelection) {
        refreshSelection = function(sel) {
            var range;
            if (api.isSelectionValid(sel.win)) {
                range = sel.docSelection.createRange();
            } else {
                range = dom.getBody(sel.win.document).createTextRange();
                range.collapse(true);
            }

            if (sel.docSelection.type == CONTROL) {
                updateControlSelection(sel);
            } else if (isTextRange(range)) {
                updateFromTextRange(sel, range);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else if (util.isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == "number") {
        refreshSelection = function(sel) {
            if (implementsControlRange && implementsDocSelection && sel.docSelection.type == CONTROL) {
                updateControlSelection(sel);
            } else {
                sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
                if (sel.rangeCount) {
                    for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                        sel._ranges[i] = new api.WrappedRange(sel.nativeSelection.getRangeAt(i));
                    }
                    updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
                    sel.isCollapsed = selectionIsCollapsed(sel);
                } else {
                    updateEmptySelection(sel);
                }
            }
        };
    } else if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && api.features.implementsDomRange) {
        refreshSelection = function(sel) {
            var range, nativeSel = sel.nativeSelection;
            if (nativeSel.anchorNode) {
                range = getSelectionRangeAt(nativeSel, 0);
                sel._ranges = [range];
                sel.rangeCount = 1;
                updateAnchorAndFocusFromNativeSelection(sel);
                sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else {
        module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
        return false;
    }

    selProto.refresh = function(checkForChanges) {
        var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
        var oldAnchorNode = this.anchorNode, oldAnchorOffset = this.anchorOffset;

        refreshSelection(this);
        if (checkForChanges) {
            // Check the range count first
            var i = oldRanges.length;
            if (i != this._ranges.length) {
                return true;
            }

            // Now check the direction. Checking the anchor position is the same is enough since we're checking all the
            // ranges after this
            if (this.anchorNode != oldAnchorNode || this.anchorOffset != oldAnchorOffset) {
                return true;
            }

            // Finally, compare each range in turn
            while (i--) {
                if (!DomRange.rangesEqual(oldRanges[i], this._ranges[i])) {
                    return true;
                }
            }
            return false;
        }
    };

    // Removal of a single range
    var removeRangeManually = function(sel, range) {
        var ranges = sel.getAllRanges();
        sel.removeAllRanges();
        for (var i = 0, len = ranges.length; i < len; ++i) {
            if (!api.DomRange.rangesEqual(range, ranges[i])) {
                sel.addRange(ranges[i]);
            }
        }
        if (!sel.rangeCount) {
            updateEmptySelection(sel);
        }
    };

    if (implementsControlRange) {
        selProto.removeRange = function(range) {
            if (this.docSelection.type == CONTROL) {
                var controlRange = this.docSelection.createRange();
                var rangeElement = getSingleElementFromRange(range);

                // Create a new ControlRange containing all the elements in the selected ControlRange minus the
                // element contained by the supplied range
                var doc = dom.getDocument(controlRange.item(0));
                var newControlRange = dom.getBody(doc).createControlRange();
                var el, removed = false;
                for (var i = 0, len = controlRange.length; i < len; ++i) {
                    el = controlRange.item(i);
                    if (el !== rangeElement || removed) {
                        newControlRange.add(controlRange.item(i));
                    } else {
                        removed = true;
                    }
                }
                newControlRange.select();

                // Update the wrapped selection based on what's now in the native selection
                updateControlSelection(this);
            } else {
                removeRangeManually(this, range);
            }
        };
    } else {
        selProto.removeRange = function(range) {
            removeRangeManually(this, range);
        };
    }

    // Detecting if a selection is backward
    var selectionIsBackward;
    if (!useDocumentSelection && selectionHasAnchorAndFocus && api.features.implementsDomRange) {
        selectionIsBackward = function(sel) {
            var backward = false;
            if (sel.anchorNode) {
                backward = (dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1);
            }
            return backward;
        };

        selProto.isBackward = function() {
            return selectionIsBackward(this);
        };
    } else {
        selectionIsBackward = selProto.isBackward = function() {
            return false;
        };
    }

    // Create an alias for backwards compatibility. From 1.3, everything is "backward" rather than "backwards"
    selProto.isBackwards = selProto.isBackward;

    // Selection stringifier
    // This is conformant to the old HTML5 selections draft spec but differs from WebKit and Mozilla's implementation.
    // The current spec does not yet define this method.
    selProto.toString = function() {
        var rangeTexts = [];
        for (var i = 0, len = this.rangeCount; i < len; ++i) {
            rangeTexts[i] = "" + this._ranges[i];
        }
        return rangeTexts.join("");
    };

    function assertNodeInSameDocument(sel, node) {
        if (sel.anchorNode && (dom.getDocument(sel.anchorNode) !== dom.getDocument(node))) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    // No current browser conforms fully to the spec for this method, so Rangy's own method is always used
    selProto.collapse = function(node, offset) {
        assertNodeInSameDocument(this, node);
        var range = api.createRange(node);
        range.collapseToPoint(node, offset);
        this.setSingleRange(range);
        this.isCollapsed = true;
    };

    selProto.collapseToStart = function() {
        if (this.rangeCount) {
            var range = this._ranges[0];
            this.collapse(range.startContainer, range.startOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    selProto.collapseToEnd = function() {
        if (this.rangeCount) {
            var range = this._ranges[this.rangeCount - 1];
            this.collapse(range.endContainer, range.endOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    // The spec is very specific on how selectAllChildren should be implemented so the native implementation is
    // never used by Rangy.
    selProto.selectAllChildren = function(node) {
        assertNodeInSameDocument(this, node);
        var range = api.createRange(node);
        range.selectNodeContents(node);
        this.removeAllRanges();
        this.addRange(range);
    };

    selProto.deleteFromDocument = function() {
        // Sepcial behaviour required for Control selections
        if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
            var controlRange = this.docSelection.createRange();
            var element;
            while (controlRange.length) {
                element = controlRange.item(0);
                controlRange.remove(element);
                element.parentNode.removeChild(element);
            }
            this.refresh();
        } else if (this.rangeCount) {
            var ranges = this.getAllRanges();
            if (ranges.length) {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    ranges[i].deleteContents();
                }
                // The spec says nothing about what the selection should contain after calling deleteContents on each
                // range. Firefox moves the selection to where the final selected range was, so we emulate that
                this.addRange(ranges[len - 1]);
            }
        }
    };

    // The following are non-standard extensions
    selProto.getAllRanges = function() {
        var ranges = [];
        for (var i = 0, len = this._ranges.length; i < len; ++i) {
            ranges[i] = this.getRangeAt(i);
        }
        return ranges;
    };

    selProto.setSingleRange = function(range, direction) {
        this.removeAllRanges();
        this.addRange(range, direction);
    };

    selProto.containsNode = function(node, allowPartial) {
        for (var i = 0, len = this._ranges.length; i < len; ++i) {
            if (this._ranges[i].containsNode(node, allowPartial)) {
                return true;
            }
        }
        return false;
    };

    selProto.toHtml = function() {
        var rangeHtmls = [];
        if (this.rangeCount) {
            for (var i = 0, len = this._ranges.length; i < len; ++i) {
                rangeHtmls.push(this._ranges[i].toHtml());
            }
        }
        return rangeHtmls.join("");
    };

    function inspect(sel) {
        var rangeInspects = [];
        var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
        var focus = new DomPosition(sel.focusNode, sel.focusOffset);
        var name = (typeof sel.getName == "function") ? sel.getName() : "Selection";

        if (typeof sel.rangeCount != "undefined") {
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
            }
        }
        return "[" + name + "(Ranges: " + rangeInspects.join(", ") +
                ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";

    }

    selProto.getName = function() {
        return "WrappedSelection";
    };

    selProto.inspect = function() {
        return inspect(this);
    };

    selProto.detach = function() {
        findCachedSelection(this.win, "delete");
        deleteProperties(this);
    };

    WrappedSelection.detachAll = function() {
        findCachedSelection(null, "deleteAll");
    };

    WrappedSelection.inspect = inspect;
    WrappedSelection.isDirectionBackward = isDirectionBackward;

    api.Selection = WrappedSelection;

    api.selectionPrototype = selProto;

    api.addCreateMissingNativeApiListener(function(win) {
        if (typeof win.getSelection == "undefined") {
            win.getSelection = function() {
                return api.getSelection(win);
            };
        }
        win = null;
    });
});

/**
 * Selection save and restore module for Rangy.
 * Saves and restores user selections using marker invisible elements in the DOM.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2012, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3alpha.681
 * Build date: 20 July 2012
 */
rangy.createModule("SaveRestore", function(api, module) {
    api.requireModules( ["DomUtil", "DomRange", "WrappedRange"] );

    var dom = api.dom;

    var markerTextChar = "\ufeff";

    function gEBI(id, doc) {
        return (doc || document).getElementById(id);
    }

    function insertRangeBoundaryMarker(range, atStart) {
        var markerId = "selectionBoundary_" + (+new Date()) + "_" + ("" + Math.random()).slice(2);
        var markerEl;
        var doc = dom.getDocument(range.startContainer);

        // Clone the Range and collapse to the appropriate boundary point
        var boundaryRange = range.cloneRange();
        boundaryRange.collapse(atStart);

        // Create the marker element containing a single invisible character using DOM methods and insert it
        markerEl = doc.createElement("span");
        markerEl.id = markerId;
        markerEl.style.lineHeight = "0";
        markerEl.style.display = "none";
        markerEl.className = "rangySelectionBoundary";
        markerEl.appendChild(doc.createTextNode(markerTextChar));

        boundaryRange.insertNode(markerEl);
        boundaryRange.detach();
        return markerEl;
    }

    function setRangeBoundary(doc, range, markerId, atStart) {
        var markerEl = gEBI(markerId, doc);
        if (markerEl) {
            range[atStart ? "setStartBefore" : "setEndBefore"](markerEl);
            markerEl.parentNode.removeChild(markerEl);
        } else {
            module.warn("Marker element has been removed. Cannot restore selection.");
        }
    }

    function compareRanges(r1, r2) {
        return r2.compareBoundaryPoints(r1.START_TO_START, r1);
    }

    function saveRange(range, backward) {
        var startEl, endEl, doc = api.DomRange.getRangeDocument(range), text = range.toString();

        if (range.collapsed) {
            endEl = insertRangeBoundaryMarker(range, false);
            return {
                document: doc,
                markerId: endEl.id,
                collapsed: true
            };
        } else {
            endEl = insertRangeBoundaryMarker(range, false);
            startEl = insertRangeBoundaryMarker(range, true);

            return {
                document: doc,
                startMarkerId: startEl.id,
                endMarkerId: endEl.id,
                collapsed: false,
                backward: backward,
                toString: function() {
                    return "original text: '" + text + "', new text: '" + range.toString() + "'";
                }
            };
        }
    }

    function restoreRange(rangeInfo, normalize) {
        var doc = rangeInfo.document;
        if (typeof normalize == "undefined") {
            normalize = true;
        }
        var range = api.createRange(doc);
        if (rangeInfo.collapsed) {
            var markerEl = gEBI(rangeInfo.markerId, doc);
            if (markerEl) {
                markerEl.style.display = "inline";
                var previousNode = markerEl.previousSibling;

                // Workaround for issue 17
                if (previousNode && previousNode.nodeType == 3) {
                    markerEl.parentNode.removeChild(markerEl);
                    range.collapseToPoint(previousNode, previousNode.length);
                } else {
                    range.collapseBefore(markerEl);
                    markerEl.parentNode.removeChild(markerEl);
                }
            } else {
                module.warn("Marker element has been removed. Cannot restore selection.");
            }
        } else {
            setRangeBoundary(doc, range, rangeInfo.startMarkerId, true);
            setRangeBoundary(doc, range, rangeInfo.endMarkerId, false);
        }

        if (normalize) {
            range.normalizeBoundaries();
        }

        return range;
    }

    function saveRanges(ranges, backward) {
        var rangeInfos = [], range, doc;

        // Order the ranges by position within the DOM, latest first, cloning the array to leave the original untouched
        ranges = ranges.slice(0);
        ranges.sort(compareRanges);

        for (var i = 0, len = ranges.length; i < len; ++i) {
            rangeInfos[i] = saveRange(ranges[i], backward);
        }

        // Now that all the markers are in place and DOM manipulation over, adjust each range's boundaries to lie
        // between its markers
        for (i = len - 1; i >= 0; --i) {
            range = ranges[i];
            doc = api.DomRange.getRangeDocument(range);
            if (range.collapsed) {
                range.collapseAfter(gEBI(rangeInfos[i].markerId, doc));
            } else {
                range.setEndBefore(gEBI(rangeInfos[i].endMarkerId, doc));
                range.setStartAfter(gEBI(rangeInfos[i].startMarkerId, doc));
            }
        }

        return rangeInfos;
    }

    function saveSelection(win) {
        if (!api.isSelectionValid(win)) {
            module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
            return null;
        }
        var sel = api.getSelection(win);
        var ranges = sel.getAllRanges();
        var backward = (ranges.length == 1 && sel.isBackward());

        var rangeInfos = saveRanges(ranges, backward);

        // Ensure current selection is unaffected
        sel.setRanges(ranges);

        return {
            win: win,
            rangeInfos: rangeInfos,
            restored: false
        };
    }

    function restoreRanges(rangeInfos) {
        var ranges = [];

        // Ranges are in reverse order of appearance in the DOM. We want to restore earliest first to avoid
        // normalization affecting previously restored ranges.
        var rangeCount = rangeInfos.length;

        for (var i = rangeCount - 1; i >= 0; i--) {
            ranges[i] = restoreRange(rangeInfos[i], true);
        }

        return ranges;
    }

    function restoreSelection(savedSelection, preserveDirection) {
        if (!savedSelection.restored) {
            var rangeInfos = savedSelection.rangeInfos;
            var sel = api.getSelection(savedSelection.win);
            var ranges = restoreRanges(rangeInfos), rangeCount = rangeInfos.length;

            if (rangeCount == 1 && preserveDirection && api.features.selectionHasExtend && rangeInfos[0].backward) {
                sel.removeAllRanges();
                sel.addRange(ranges[0], true);
            } else {
                sel.setRanges(ranges);
            }

            savedSelection.restored = true;
        }
    }

    function removeMarkerElement(doc, markerId) {
        var markerEl = gEBI(markerId, doc);
        if (markerEl) {
            markerEl.parentNode.removeChild(markerEl);
        }
    }

    function removeMarkers(savedSelection) {
        var rangeInfos = savedSelection.rangeInfos;
        for (var i = 0, len = rangeInfos.length, rangeInfo; i < len; ++i) {
            rangeInfo = rangeInfos[i];
            if (rangeInfo.collapsed) {
                removeMarkerElement(savedSelection.doc, rangeInfo.markerId);
            } else {
                removeMarkerElement(savedSelection.doc, rangeInfo.startMarkerId);
                removeMarkerElement(savedSelection.doc, rangeInfo.endMarkerId);
            }
        }
    }

    api.util.extend(api, {
        saveRange: saveRange,
        restoreRange: restoreRange,
        saveRanges: saveRanges,
        restoreRanges: restoreRanges,
        saveSelection: saveSelection,
        restoreSelection: restoreSelection,
        removeMarkerElement: removeMarkerElement,
        removeMarkers: removeMarkers
    });
});

;!function(exports, undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = new Object;
  }

  function configure(conf) {
    if (conf) {
      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.wildcard && (this.wildcard = conf.wildcard);
      if (this.wildcard) {
        this.listenerTree = new Object;
      }
    }
  }

  function EventEmitter(conf) {
    this._events = new Object;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }
    
    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }
        
        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
    
    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = new Object;
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;
            
            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  };

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    };

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {
    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener') {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      
      if (!this._all && 
        !this._events.error && 
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || this._all;
    }
    else {
      return this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {
    
    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;
        
        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if(!this._all) {
      this._all = [];
    }

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          return this;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1)
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
    define(function() {
      return EventEmitter;
    });
  } else {
    exports.EventEmitter2 = EventEmitter; 
  }

}(typeof process !== 'undefined' && typeof process.title !== 'undefined' && typeof exports !== 'undefined' ? exports : window);
// Inspired by http://blog.jcoglan.com/2007/07/23/writing-a-linked-list-in-javascript/

function LinkedList() {}
LinkedList.prototype = {
  length: 0,
  first: null,
  last: null
};

LinkedList.prototype.append = function(node) {
  if (typeof this.first === 'undefined' || this.first === null) {
    this.first = node;
  } else {
    node.next = null;
    this.last.next = node;
  }
  node.prev = this.last;
  this.last = node;
  this.length++;
};

LinkedList.prototype.insertAfter = function(node, newNode) {
  newNode.prev = node;
  if (node) {
    newNode.next = node.next;
    if (typeof node.next != 'undefined' && node.next !== null) {
      node.next.prev = newNode;
    }
    node.next = newNode;
    if (node === this.last) {
      this.last = newNode;
    }
  }
  else {
    // Insert after null implies inserting at position 0
    newNode.next = this.first;
    this.first.prev = newNode;
    this.first = newNode;
  }
  this.length++;
};

LinkedList.prototype.remove = function(node) {
  if (this.length > 1) {
    if (typeof node.prev !== 'undefined' && node.prev !== null) {
      node.prev.next = node.next;
    }
    if (typeof node.next !== 'undefined' && node.next !== null) {
      node.next.prev = node.prev;
    }
    if (node == this.first) { this.first = node.next; }
    if (node == this.last) { this.last = node.prev; }
  } else {
    this.first = null;
    this.last = null;
  }
  node.prev = null;
  node.next = null;
  this.length--;
};

LinkedList.prototype.toArray = function() {
  var arr = [];
  var cur = this.first;
  while (cur) {
    arr.push(cur);
    cur = cur.next;
  }
  return arr;
}

LinkedList.Node = function(data) {
  this.prev = null; this.next = null;
  this.data = data;
};

/*! Tandem Realtime Coauthoring Engine - v0.3.4 - 2013-02-07
 *  https://www.stypi.com/
 *  Copyright (c) 2013
 *  Jason Chen, Salesforce.com
 *  Byron Milligan, Salesforce.com
 */

(function(){
var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/src/core/delta.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Delta, InsertOp, Op, RetainOp, diff_match_patch, dmp, _,
    __slice = [].slice;

  if (typeof module !== "undefined" && module !== null) {
    _ = require('underscore')._;
  }

  diff_match_patch = require('googlediff');

  Op = require('./op');

  InsertOp = require('./insert');

  RetainOp = require('./retain');

  dmp = new diff_match_patch();

  dmp.DIFF_DELETE = -1;

  dmp.DIFF_EQUAL = 0;

  dmp.DIFF_INSERT = 1;

  Delta = (function() {

    Delta.copy = function(subject) {
      var changes, op, _i, _len, _ref;
      changes = [];
      _ref = subject.ops;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        op = _ref[_i];
        if (Delta.isRetain(op)) {
          changes.push(RetainOp.copy(op));
        } else {
          changes.push(InsertOp.copy(op));
        }
      }
      return new Delta(subject.startLength, subject.endLength, changes);
    };

    Delta.getIdentity = function(length) {
      var delta;
      delta = new Delta(length, length, [new RetainOp(0, length)]);
      return delta;
    };

    Delta.getInitial = function(contents) {
      return new Delta(0, contents.length, [new InsertOp(contents)]);
    };

    Delta.isDelta = function(delta) {
      var op, _i, _len, _ref;
      if ((delta != null) && typeof delta === "object" && typeof delta.startLength === "number" && typeof delta.endLength === "number" && typeof delta.ops === "object") {
        _ref = delta.ops;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          op = _ref[_i];
          if (!Delta.isRetain(op) && !Delta.isInsert(op)) {
            return false;
          }
        }
        return true;
      }
      return false;
    };

    Delta.isInsert = function(change) {
      return InsertOp.isInsert(change);
    };

    Delta.isRetain = function(change) {
      return RetainOp.isRetain(change) || typeof change === "number";
    };

    Delta.makeDelta = function(obj) {
      return new Delta(obj.startLength, obj.endLength, obj.ops);
    };

    function Delta(startLength, endLength, ops) {
      var length;
      this.startLength = startLength;
      this.endLength = endLength;
      this.ops = ops;
      if (this.ops == null) {
        this.ops = this.endLength;
        this.endLength = null;
      }
      this.compact();
      length = _.reduce(this.ops, function(count, op) {
        return count + op.getLength();
      }, 0);
      if (this.endLength != null) {
        console.assert(length === this.endLength, "Expecting end length of", length, this);
      } else {
        this.endLength = length;
      }
    }

    Delta.prototype.apply = function(insertFn, deleteFn, applyAttrFn, context) {
      var index, offset, retains,
        _this = this;
      if (context == null) {
        context = null;
      }
      if (this.isIdentity()) {
        return;
      }
      index = 0;
      offset = 0;
      retains = [];
      _.each(this.ops, function(op) {
        if (Delta.isInsert(op)) {
          insertFn.call(context, index + offset, op.value);
          retains.push(new RetainOp(index + offset, index + offset + op.getLength(), op.attributes));
          return offset += op.getLength();
        } else if (Delta.isRetain(op)) {
          if (op.start > index) {
            deleteFn.call(context, index + offset, op.start - index);
            offset -= op.start - index;
          }
          retains.push(new RetainOp(op.start + offset, op.end + offset, op.attributes));
          return index = op.end;
        } else {
          return console.warn('Unrecognized type in delta', op);
        }
      });
      if (this.endLength < this.startLength + offset) {
        deleteFn.call(context, this.endLength, this.startLength + offset - this.endLength);
      }
      return _.each(retains, function(op) {
        _.each(op.attributes, function(value, format) {
          if (value === null) {
            return applyAttrFn.call(context, op.start, op.end - op.start, format, value);
          }
        });
        return _.each(op.attributes, function(value, format) {
          if (value != null) {
            return applyAttrFn.call(context, op.start, op.end - op.start, format, value);
          }
        });
      });
    };

    Delta.prototype.applyToText = function(text) {
      var appliedText, delta, elem, result, _i, _len, _ref;
      delta = this;
      console.assert(text.length === delta.startLength, "Start length of delta: " + delta.startLength + " is not equal to the text: " + text.length);
      appliedText = [];
      _ref = delta.ops;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (Delta.isInsert(elem)) {
          appliedText.push(elem.value);
        } else {
          appliedText.push(text.substring(elem.start, elem.end));
        }
      }
      result = appliedText.join("");
      if (delta.endLength !== result.length) {
        console.log("Delta", delta);
        console.log("text", text);
        console.log("result", result);
        console.assert(false, "End length of delta: " + delta.endLength + " is not equal to result text: " + result.length);
      }
      return result;
    };

    Delta.prototype.canCompose = function(delta) {
      return Delta.isDelta(delta) && this.endLength === delta.startLength;
    };

    Delta.prototype.compact = function() {
      var compacted;
      this.normalize();
      compacted = [];
      _.each(this.ops, function(op) {
        var last;
        if (compacted.length === 0) {
          if (!(RetainOp.isRetain(op) && op.start === op.end)) {
            return compacted.push(op);
          }
        } else {
          if (RetainOp.isRetain(op) && op.start === op.end) {
            return;
          }
          last = _.last(compacted);
          if (InsertOp.isInsert(last) && InsertOp.isInsert(op) && last.attributesMatch(op)) {
            return last.value = last.value + op.value;
          } else if (RetainOp.isRetain(last) && RetainOp.isRetain(op) && last.end === op.start && last.attributesMatch(op)) {
            return last.end = op.end;
          } else {
            return compacted.push(op);
          }
        }
      });
      return this.ops = compacted;
    };

    Delta.prototype.compose = function(deltaB) {
      var composed, deltaA, deltaC, elem, opsInRange, _i, _len, _ref;
      console.assert(this.canCompose(deltaB), "Cannot compose delta", this, deltaB);
      deltaA = new Delta(this.startLength, this.endLength, this.ops);
      deltaB = new Delta(deltaB.startLength, deltaB.endLength, deltaB.ops);
      composed = [];
      _ref = deltaB.ops;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (typeof elem === 'string') {
          elem = new InsertOp(elem);
        }
        if (Delta.isInsert(elem)) {
          composed.push(elem);
        } else if (Delta.isRetain(elem)) {
          opsInRange = deltaA.getOpsAt(elem.start, elem.end - elem.start);
          opsInRange = _.map(opsInRange, function(op) {
            if (Delta.isInsert(op)) {
              return new InsertOp(op.value, op.composeAttributes(elem.attributes));
            } else {
              return new RetainOp(op.start, op.end, op.composeAttributes(elem.attributes));
            }
          });
          composed = composed.concat(opsInRange);
        } else {
          console.assert(false, "Invalid op in deltaB when composing", deltaB);
        }
      }
      deltaC = new Delta(deltaA.startLength, deltaB.endLength, composed);
      console.assert(Delta.isDelta(deltaC), "Composed returning invalid Delta", deltaC);
      return deltaC;
    };

    Delta.prototype.decompose = function(deltaA) {
      var decomposeAttributes, deltaB, deltaC, insertDelta, offset, ops;
      deltaC = this;
      console.assert(Delta.isDelta(deltaA), "Decompose called when deltaA is not a Delta, type: " + typeof deltaA);
      console.assert(deltaA.startLength === this.startLength, "startLength " + deltaA.startLength + " / startLength " + this.startLength + " mismatch");
      console.assert(_.all(deltaA.ops, (function(op) {
        return op.value != null;
      })), "DeltaA has retain in decompose");
      console.assert(_.all(deltaC.ops, (function(op) {
        return op.value != null;
      })), "DeltaC has retain in decompose");
      decomposeAttributes = function(attrA, attrC) {
        var decomposedAttributes, key, value;
        decomposedAttributes = {};
        for (key in attrC) {
          value = attrC[key];
          if (attrA[key] === void 0 || attrA[key] !== value) {
            if (attrA[key] !== null && typeof attrA[key] === 'object' && value !== null && typeof value === 'object') {
              decomposedAttributes[key] = decomposeAttributes(attrA[key], value);
            } else {
              decomposedAttributes[key] = value;
            }
          }
        }
        for (key in attrA) {
          value = attrA[key];
          if (attrC[key] === void 0) {
            decomposedAttributes[key] = null;
          }
        }
        return decomposedAttributes;
      };
      insertDelta = deltaA.diff(deltaC);
      ops = [];
      offset = 0;
      _.each(insertDelta.ops, function(op) {
        var offsetC, opsInC;
        opsInC = deltaC.getOpsAt(offset, op.getLength());
        offsetC = 0;
        _.each(opsInC, function(opInC) {
          var d, offsetA, opsInA;
          if (Delta.isInsert(op)) {
            d = new InsertOp(op.value.substring(offsetC, offsetC + opInC.getLength()), opInC.attributes);
            ops.push(d);
          } else if (Delta.isRetain(op)) {
            opsInA = deltaA.getOpsAt(op.start + offsetC, opInC.getLength());
            offsetA = 0;
            _.each(opsInA, function(opInA) {
              var attributes, e, start;
              attributes = decomposeAttributes(opInA.attributes, opInC.attributes);
              start = op.start + offsetA + offsetC;
              e = new RetainOp(start, start + opInA.getLength(), attributes);
              ops.push(e);
              return offsetA += opInA.getLength();
            });
          } else {
            console.error("Invalid delta in deltaB when composing", deltaB);
          }
          return offsetC += opInC.getLength();
        });
        return offset += op.getLength();
      });
      deltaB = new Delta(insertDelta.startLength, insertDelta.endLength, ops);
      return deltaB;
    };

    Delta.prototype.diff = function(other) {
      var deltaToText, diff, diffTexts, diffToDelta, insertDelta, textA, textC;
      diffToDelta = function(diff) {
        var finalLength, operation, ops, originalLength, value, _i, _len, _ref;
        console.assert(diff.length > 0, "diffToDelta called with diff with length <= 0");
        originalLength = 0;
        finalLength = 0;
        ops = [];
        for (_i = 0, _len = diff.length; _i < _len; _i++) {
          _ref = diff[_i], operation = _ref[0], value = _ref[1];
          switch (operation) {
            case dmp.DIFF_DELETE:
              originalLength += value.length;
              break;
            case dmp.DIFF_INSERT:
              ops.push(new InsertOp(value));
              finalLength += value.length;
              break;
            case dmp.DIFF_EQUAL:
              ops.push(new RetainOp(originalLength, originalLength + value.length));
              originalLength += value.length;
              finalLength += value.length;
          }
        }
        return new Delta(originalLength, finalLength, ops);
      };
      deltaToText = function(delta) {
        return _.map(delta.ops, function(op) {
          if (op.value != null) {
            return op.value;
          } else {
            return "";
          }
        }).join('');
      };
      diffTexts = function(oldText, newText) {
        var diff;
        diff = dmp.diff_main(oldText, newText);
        return diff;
      };
      textA = deltaToText(this);
      textC = deltaToText(other);
      if (!(textA === '' && textC === '')) {
        diff = diffTexts(textA, textC);
        insertDelta = diffToDelta(diff);
      } else {
        insertDelta = new Delta(0, 0, []);
      }
      return insertDelta;
    };

    Delta.prototype.follows = function(deltaA, aIsRemote) {
      var addedAttributes, deltaB, elem, elemA, elemB, elemIndexA, elemIndexB, follow, followEndLength, followSet, followStartLength, indexA, indexB, length, _i, _len;
      deltaB = this;
      console.assert(Delta.isDelta(deltaA), "Follows called when deltaA is not a Delta, type: " + typeof deltaA, deltaA);
      console.assert(aIsRemote != null, "Remote delta not specified");
      deltaA = new Delta(deltaA.startLength, deltaA.endLength, deltaA.ops);
      deltaB = new Delta(deltaB.startLength, deltaB.endLength, deltaB.ops);
      followStartLength = deltaA.endLength;
      followSet = [];
      indexA = indexB = 0;
      elemIndexA = elemIndexB = 0;
      while (elemIndexA < deltaA.ops.length && elemIndexB < deltaB.ops.length) {
        elemA = deltaA.ops[elemIndexA];
        elemB = deltaB.ops[elemIndexB];
        if (Delta.isInsert(elemA) && Delta.isInsert(elemB)) {
          length = Math.min(elemA.getLength(), elemB.getLength());
          if (aIsRemote) {
            followSet.push(new RetainOp(indexA, indexA + length));
            indexA += length;
            if (length === elemA.getLength()) {
              elemIndexA++;
            } else {
              console.assert(length < elemA.getLength());
              deltaA.ops[elemIndexA] = _.last(elemA.split(length));
            }
          } else {
            followSet.push(_.first(elemB.split(length)));
            indexB += length;
            if (length === elemB.getLength()) {
              elemIndexB++;
            } else {
              deltaB.ops[elemIndexB] = _.last(elemB.split(length));
            }
          }
        } else if (Delta.isRetain(elemA) && Delta.isRetain(elemB)) {
          if (elemA.end < elemB.start) {
            indexA += elemA.getLength();
            elemIndexA++;
          } else if (elemB.end < elemA.start) {
            indexB += elemB.getLength();
            elemIndexB++;
          } else {
            if (elemA.start < elemB.start) {
              indexA += elemB.start - elemA.start;
              elemA = deltaA.ops[elemIndexA] = new RetainOp(elemB.start, elemA.end, elemA.attributes);
            } else if (elemB.start < elemA.start) {
              indexB += elemA.start - elemB.start;
              elemB = deltaB.ops[elemIndexB] = new RetainOp(elemA.start, elemB.end, elemB.attributes);
            }
            console.assert(elemA.start === elemB.start, "RetainOps must have same          start length when propagating into followset", elemA, elemB);
            length = Math.min(elemA.end, elemB.end) - elemA.start;
            addedAttributes = elemA.addAttributes(elemB.attributes);
            followSet.push(new RetainOp(indexA, indexA + length, addedAttributes));
            indexA += length;
            indexB += length;
            if (elemA.end === elemB.end) {
              elemIndexA++;
              elemIndexB++;
            } else if (elemA.end < elemB.end) {
              elemIndexA++;
              deltaB.ops[elemIndexB] = _.last(elemB.split(length));
            } else {
              deltaA.ops[elemIndexA] = _.last(elemA.split(length));
              elemIndexB++;
            }
          }
        } else if (Delta.isInsert(elemA) && Delta.isRetain(elemB)) {
          followSet.push(new RetainOp(indexA, indexA + elemA.getLength()));
          indexA += elemA.getLength();
          elemIndexA++;
        } else if (Delta.isRetain(elemA) && Delta.isInsert(elemB)) {
          followSet.push(elemB);
          indexB += elemB.getLength();
          elemIndexB++;
        } else {
          console.warn("Mismatch. elemA is: " + typeof elemA + ", elemB is:  " + typeof elemB);
        }
      }
      while (elemIndexA < deltaA.ops.length) {
        elemA = deltaA.ops[elemIndexA];
        if (Delta.isInsert(elemA)) {
          followSet.push(new RetainOp(indexA, indexA + elemA.getLength()));
        }
        indexA += elemA.getLength();
        elemIndexA++;
      }
      while (elemIndexB < deltaB.ops.length) {
        elemB = deltaB.ops[elemIndexB];
        if (Delta.isInsert(elemB)) {
          followSet.push(elemB);
        }
        indexB += elemB.getLength();
        elemIndexB++;
      }
      followEndLength = 0;
      for (_i = 0, _len = followSet.length; _i < _len; _i++) {
        elem = followSet[_i];
        followEndLength += elem.getLength();
      }
      follow = new Delta(followStartLength, followEndLength, followSet);
      console.assert(Delta.isDelta(follow), "Follows returning invalid Delta", follow);
      return follow;
    };

    Delta.prototype.getOpsAt = function(index, length) {
      var changes, getLength, offset, op, opLength, start, _i, _len, _ref;
      changes = [];
      if ((this.savedOpOffset != null) && this.savedOpOffset < index) {
        offset = this.savedOpOffset;
      } else {
        offset = this.savedOpOffset = this.savedOpIndex = 0;
      }
      _ref = this.ops.slice(this.savedOpIndex);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        op = _ref[_i];
        if (offset >= index + length) {
          break;
        }
        opLength = op.getLength();
        if (index < offset + opLength) {
          start = Math.max(index - offset, 0);
          getLength = Math.min(opLength - start, index + length - offset - start);
          changes.push(op.getAt(start, getLength));
        }
        offset += opLength;
        this.savedOpIndex += 1;
        this.savedOpOffset += opLength;
      }
      return changes;
    };

    Delta.prototype.invert = function(deltaB) {
      var deltaA, deltaC, inverse;
      console.assert(this.isInsertsOnly(), "Invert called on invalid delta containing non-insert ops: " + deltaA);
      deltaA = this;
      deltaC = deltaA.compose(deltaB);
      inverse = deltaA.decompose(deltaC);
      return inverse;
    };

    Delta.prototype.isEqual = function(other) {
      var keys;
      if (!other) {
        return false;
      }
      keys = ['startLength', 'endLength', 'ops'];
      return _.isEqual(_.pick.apply(_, [this].concat(__slice.call(keys))), _.pick.apply(_, [other].concat(__slice.call(keys))));
    };

    Delta.prototype.isIdentity = function() {
      var index, op, _i, _len, _ref;
      if (this.startLength === this.endLength) {
        if (this.ops.length === 0) {
          return true;
        }
        index = 0;
        _ref = this.ops;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          op = _ref[_i];
          if (!RetainOp.isRetain(op)) {
            return false;
          }
          if (op.start !== index) {
            return false;
          }
          if (!(op.numAttributes() === 0 || (op.numAttributes() === 1 && _.has(op.attributes, 'authorId')))) {
            return false;
          }
          index = op.end;
        }
        if (index !== this.endLength) {
          return false;
        }
        return true;
      }
      return false;
    };

    Delta.prototype.isInsertsOnly = function() {
      return _.every(this.ops, function(op) {
        return Delta.isInsert(op);
      });
    };

    Delta.prototype.normalize = function() {
      var normalizedOps;
      normalizedOps = _.map(this.ops, function(op) {
        switch (typeof op) {
          case 'string':
            return new InsertOp(op);
          case 'number':
            return new RetainOp(op, op + 1);
          case 'object':
            if (op.value != null) {
              return new InsertOp(op.value, op.attributes);
            } else if ((op.start != null) && (op.end != null)) {
              return new RetainOp(op.start, op.end, op.attributes);
            }
            break;
          default:
            return null;
        }
      });
      return this.ops = _.reject(normalizedOps, function(op) {
        return !(op != null) || op.getLength() === 0;
      });
    };

    Delta.prototype.toString = function() {
      return "{(" + this.startLength + "->" + this.endLength + ") [" + (this.ops.join(', ')) + "]}";
    };

    return Delta;

  })();

  module.exports = Delta;

}).call(this);

});

require.define("/node_modules/underscore/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"underscore.js"}
});

require.define("/node_modules/underscore/underscore.js",function(require,module,exports,__dirname,__filename,process,global){//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

});

require.define("/node_modules/googlediff/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {}
});

require.define("/node_modules/googlediff/index.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = require('./javascript/diff_match_patch_uncompressed.js').diff_match_patch;

});

require.define("/node_modules/googlediff/javascript/diff_match_patch_uncompressed.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * Diff Match and Patch
 *
 * Copyright 2006 Google Inc.
 * http://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Computes the difference between two texts to create a patch.
 * Applies the patch onto another text, allowing for errors.
 * @author fraser@google.com (Neil Fraser)
 */

/**
 * Class containing the diff, match and patch methods.
 * @constructor
 */
function diff_match_patch() {

  // Defaults.
  // Redefine these in your program to override the defaults.

  // Number of seconds to map a diff before giving up (0 for infinity).
  this.Diff_Timeout = 1.0;
  // Cost of an empty edit operation in terms of edit characters.
  this.Diff_EditCost = 4;
  // At what point is no match declared (0.0 = perfection, 1.0 = very loose).
  this.Match_Threshold = 0.5;
  // How far to search for a match (0 = exact location, 1000+ = broad match).
  // A match this many characters away from the expected location will add
  // 1.0 to the score (0.0 is a perfect match).
  this.Match_Distance = 1000;
  // When deleting a large block of text (over ~64 characters), how close do
  // the contents have to be to match the expected contents. (0.0 = perfection,
  // 1.0 = very loose).  Note that Match_Threshold controls how closely the
  // end points of a delete need to match.
  this.Patch_DeleteThreshold = 0.5;
  // Chunk size for context length.
  this.Patch_Margin = 4;

  // The number of bits in an int.
  this.Match_MaxBits = 32;
}


//  DIFF FUNCTIONS


/**
 * The data structure representing a diff is an array of tuples:
 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
 */
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;
var DIFF_EQUAL = 0;

/** @typedef {{0: number, 1: string}} */
diff_match_patch.Diff;


/**
 * Find the differences between two texts.  Simplifies the problem by stripping
 * any common prefix or suffix off the texts before diffing.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean=} opt_checklines Optional speedup flag. If present and false,
 *     then don't run a line-level diff first to identify the changed areas.
 *     Defaults to true, which does a faster, slightly less optimal diff.
 * @param {number} opt_deadline Optional time when the diff should be complete
 *     by.  Used internally for recursive calls.  Users should set DiffTimeout
 *     instead.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 */
diff_match_patch.prototype.diff_main = function(text1, text2, opt_checklines,
    opt_deadline) {
  // Set a deadline by which time the diff must be complete.
  if (typeof opt_deadline == 'undefined') {
    if (this.Diff_Timeout <= 0) {
      opt_deadline = Number.MAX_VALUE;
    } else {
      opt_deadline = (new Date).getTime() + this.Diff_Timeout * 1000;
    }
  }
  var deadline = opt_deadline;

  // Check for null inputs.
  if (text1 == null || text2 == null) {
    throw new Error('Null input. (diff_main)');
  }

  // Check for equality (speedup).
  if (text1 == text2) {
    if (text1) {
      return [[DIFF_EQUAL, text1]];
    }
    return [];
  }

  if (typeof opt_checklines == 'undefined') {
    opt_checklines = true;
  }
  var checklines = opt_checklines;

  // Trim off common prefix (speedup).
  var commonlength = this.diff_commonPrefix(text1, text2);
  var commonprefix = text1.substring(0, commonlength);
  text1 = text1.substring(commonlength);
  text2 = text2.substring(commonlength);

  // Trim off common suffix (speedup).
  commonlength = this.diff_commonSuffix(text1, text2);
  var commonsuffix = text1.substring(text1.length - commonlength);
  text1 = text1.substring(0, text1.length - commonlength);
  text2 = text2.substring(0, text2.length - commonlength);

  // Compute the diff on the middle block.
  var diffs = this.diff_compute_(text1, text2, checklines, deadline);

  // Restore the prefix and suffix.
  if (commonprefix) {
    diffs.unshift([DIFF_EQUAL, commonprefix]);
  }
  if (commonsuffix) {
    diffs.push([DIFF_EQUAL, commonsuffix]);
  }
  this.diff_cleanupMerge(diffs);
  return diffs;
};


/**
 * Find the differences between two texts.  Assumes that the texts do not
 * have any common prefix or suffix.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean} checklines Speedup flag.  If false, then don't run a
 *     line-level diff first to identify the changed areas.
 *     If true, then run a faster, slightly less optimal diff.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_compute_ = function(text1, text2, checklines,
    deadline) {
  var diffs;

  if (!text1) {
    // Just add some text (speedup).
    return [[DIFF_INSERT, text2]];
  }

  if (!text2) {
    // Just delete some text (speedup).
    return [[DIFF_DELETE, text1]];
  }

  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  var i = longtext.indexOf(shorttext);
  if (i != -1) {
    // Shorter text is inside the longer text (speedup).
    diffs = [[DIFF_INSERT, longtext.substring(0, i)],
             [DIFF_EQUAL, shorttext],
             [DIFF_INSERT, longtext.substring(i + shorttext.length)]];
    // Swap insertions for deletions if diff is reversed.
    if (text1.length > text2.length) {
      diffs[0][0] = diffs[2][0] = DIFF_DELETE;
    }
    return diffs;
  }

  if (shorttext.length == 1) {
    // Single character string.
    // After the previous speedup, the character can't be an equality.
    return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  }

  // Check to see if the problem can be split in two.
  var hm = this.diff_halfMatch_(text1, text2);
  if (hm) {
    // A half-match was found, sort out the return data.
    var text1_a = hm[0];
    var text1_b = hm[1];
    var text2_a = hm[2];
    var text2_b = hm[3];
    var mid_common = hm[4];
    // Send both pairs off for separate processing.
    var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
    var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
    // Merge the results.
    return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
  }

  if (checklines && text1.length > 100 && text2.length > 100) {
    return this.diff_lineMode_(text1, text2, deadline);
  }

  return this.diff_bisect_(text1, text2, deadline);
};


/**
 * Do a quick line-level diff on both strings, then rediff the parts for
 * greater accuracy.
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_lineMode_ = function(text1, text2, deadline) {
  // Scan the text on a line-by-line basis first.
  var a = this.diff_linesToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var linearray = a.lineArray;

  var diffs = this.diff_main(text1, text2, false, deadline);

  // Convert the diff back to original text.
  this.diff_charsToLines_(diffs, linearray);
  // Eliminate freak matches (e.g. blank lines)
  this.diff_cleanupSemantic(diffs);

  // Rediff any replacement blocks, this time character-by-character.
  // Add a dummy entry at the end.
  diffs.push([DIFF_EQUAL, '']);
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete >= 1 && count_insert >= 1) {
          // Delete the offending records and add the merged ones.
          diffs.splice(pointer - count_delete - count_insert,
                       count_delete + count_insert);
          pointer = pointer - count_delete - count_insert;
          var a = this.diff_main(text_delete, text_insert, false, deadline);
          for (var j = a.length - 1; j >= 0; j--) {
            diffs.splice(pointer, 0, a[j]);
          }
          pointer = pointer + a.length;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
    pointer++;
  }
  diffs.pop();  // Remove the dummy entry at the end.

  return diffs;
};


/**
 * Find the 'middle snake' of a diff, split the problem in two
 * and return the recursively constructed diff.
 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisect_ = function(text1, text2, deadline) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  var max_d = Math.ceil((text1_length + text2_length) / 2);
  var v_offset = max_d;
  var v_length = 2 * max_d;
  var v1 = new Array(v_length);
  var v2 = new Array(v_length);
  // Setting all elements to -1 is faster in Chrome & Firefox than mixing
  // integers and undefined.
  for (var x = 0; x < v_length; x++) {
    v1[x] = -1;
    v2[x] = -1;
  }
  v1[v_offset + 1] = 0;
  v2[v_offset + 1] = 0;
  var delta = text1_length - text2_length;
  // If the total number of characters is odd, then the front path will collide
  // with the reverse path.
  var front = (delta % 2 != 0);
  // Offsets for start and end of k loop.
  // Prevents mapping of space beyond the grid.
  var k1start = 0;
  var k1end = 0;
  var k2start = 0;
  var k2end = 0;
  for (var d = 0; d < max_d; d++) {
    // Bail out if deadline is reached.
    if ((new Date()).getTime() > deadline) {
      break;
    }

    // Walk the front path one step.
    for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      var k1_offset = v_offset + k1;
      var x1;
      if (k1 == -d || (k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
        x1 = v1[k1_offset + 1];
      } else {
        x1 = v1[k1_offset - 1] + 1;
      }
      var y1 = x1 - k1;
      while (x1 < text1_length && y1 < text2_length &&
             text1.charAt(x1) == text2.charAt(y1)) {
        x1++;
        y1++;
      }
      v1[k1_offset] = x1;
      if (x1 > text1_length) {
        // Ran off the right of the graph.
        k1end += 2;
      } else if (y1 > text2_length) {
        // Ran off the bottom of the graph.
        k1start += 2;
      } else if (front) {
        var k2_offset = v_offset + delta - k1;
        if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
          // Mirror x2 onto top-left coordinate system.
          var x2 = text1_length - v2[k2_offset];
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }

    // Walk the reverse path one step.
    for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      var k2_offset = v_offset + k2;
      var x2;
      if (k2 == -d || (k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
        x2 = v2[k2_offset + 1];
      } else {
        x2 = v2[k2_offset - 1] + 1;
      }
      var y2 = x2 - k2;
      while (x2 < text1_length && y2 < text2_length &&
             text1.charAt(text1_length - x2 - 1) ==
             text2.charAt(text2_length - y2 - 1)) {
        x2++;
        y2++;
      }
      v2[k2_offset] = x2;
      if (x2 > text1_length) {
        // Ran off the left of the graph.
        k2end += 2;
      } else if (y2 > text2_length) {
        // Ran off the top of the graph.
        k2start += 2;
      } else if (!front) {
        var k1_offset = v_offset + delta - k2;
        if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
          var x1 = v1[k1_offset];
          var y1 = v_offset + x1 - k1_offset;
          // Mirror x2 onto top-left coordinate system.
          x2 = text1_length - x2;
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }
  }
  // Diff took too long and hit the deadline or
  // number of diffs equals number of characters, no commonality at all.
  return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
};


/**
 * Given the location of the 'middle snake', split the diff in two parts
 * and recurse.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} x Index of split point in text1.
 * @param {number} y Index of split point in text2.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisectSplit_ = function(text1, text2, x, y,
    deadline) {
  var text1a = text1.substring(0, x);
  var text2a = text2.substring(0, y);
  var text1b = text1.substring(x);
  var text2b = text2.substring(y);

  // Compute both diffs serially.
  var diffs = this.diff_main(text1a, text2a, false, deadline);
  var diffsb = this.diff_main(text1b, text2b, false, deadline);

  return diffs.concat(diffsb);
};


/**
 * Split two texts into an array of strings.  Reduce the texts to a string of
 * hashes where each Unicode character represents one line.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
 *     An object containing the encoded text1, the encoded text2 and
 *     the array of unique strings.
 *     The zeroth element of the array of unique strings is intentionally blank.
 * @private
 */
diff_match_patch.prototype.diff_linesToChars_ = function(text1, text2) {
  var lineArray = [];  // e.g. lineArray[4] == 'Hello\n'
  var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

  // '\x00' is a valid character, but various debuggers don't like it.
  // So we'll insert a junk entry to avoid generating a null character.
  lineArray[0] = '';

  /**
   * Split a text into an array of strings.  Reduce the texts to a string of
   * hashes where each Unicode character represents one line.
   * Modifies linearray and linehash through being a closure.
   * @param {string} text String to encode.
   * @return {string} Encoded string.
   * @private
   */
  function diff_linesToCharsMunge_(text) {
    var chars = '';
    // Walk the text, pulling out a substring for each line.
    // text.split('\n') would would temporarily double our memory footprint.
    // Modifying text would create many large strings to garbage collect.
    var lineStart = 0;
    var lineEnd = -1;
    // Keeping our own length variable is faster than looking it up.
    var lineArrayLength = lineArray.length;
    while (lineEnd < text.length - 1) {
      lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd == -1) {
        lineEnd = text.length - 1;
      }
      var line = text.substring(lineStart, lineEnd + 1);
      lineStart = lineEnd + 1;

      if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
          (lineHash[line] !== undefined)) {
        chars += String.fromCharCode(lineHash[line]);
      } else {
        chars += String.fromCharCode(lineArrayLength);
        lineHash[line] = lineArrayLength;
        lineArray[lineArrayLength++] = line;
      }
    }
    return chars;
  }

  var chars1 = diff_linesToCharsMunge_(text1);
  var chars2 = diff_linesToCharsMunge_(text2);
  return {chars1: chars1, chars2: chars2, lineArray: lineArray};
};


/**
 * Rehydrate the text in a diff from a string of line hashes to real lines of
 * text.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {!Array.<string>} lineArray Array of unique strings.
 * @private
 */
diff_match_patch.prototype.diff_charsToLines_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = [];
    for (var y = 0; y < chars.length; y++) {
      text[y] = lineArray[chars.charCodeAt(y)];
    }
    diffs[x][1] = text.join('');
  }
};


/**
 * Determine the common prefix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the start of each
 *     string.
 */
diff_match_patch.prototype.diff_commonPrefix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) ==
        text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine the common suffix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of each string.
 */
diff_match_patch.prototype.diff_commonSuffix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 ||
      text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) ==
        text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine if the suffix of one string is the prefix of another.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of the first
 *     string and the start of the second string.
 * @private
 */
diff_match_patch.prototype.diff_commonOverlap_ = function(text1, text2) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  // Eliminate the null case.
  if (text1_length == 0 || text2_length == 0) {
    return 0;
  }
  // Truncate the longer string.
  if (text1_length > text2_length) {
    text1 = text1.substring(text1_length - text2_length);
  } else if (text1_length < text2_length) {
    text2 = text2.substring(0, text1_length);
  }
  var text_length = Math.min(text1_length, text2_length);
  // Quick check for the worst case.
  if (text1 == text2) {
    return text_length;
  }

  // Start by looking for a single character match
  // and increase length until no match is found.
  // Performance analysis: http://neil.fraser.name/news/2010/11/04/
  var best = 0;
  var length = 1;
  while (true) {
    var pattern = text1.substring(text_length - length);
    var found = text2.indexOf(pattern);
    if (found == -1) {
      return best;
    }
    length += found;
    if (found == 0 || text1.substring(text_length - length) ==
        text2.substring(0, length)) {
      best = length;
      length++;
    }
  }
};


/**
 * Do the two texts share a substring which is at least half the length of the
 * longer text?
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {Array.<string>} Five element Array, containing the prefix of
 *     text1, the suffix of text1, the prefix of text2, the suffix of
 *     text2 and the common middle.  Or null if there was no match.
 * @private
 */
diff_match_patch.prototype.diff_halfMatch_ = function(text1, text2) {
  if (this.Diff_Timeout <= 0) {
    // Don't risk returning a non-optimal diff if we have unlimited time.
    return null;
  }
  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
    return null;  // Pointless.
  }
  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Does a substring of shorttext exist within longtext such that the substring
   * is at least half the length of longtext?
   * Closure, but does not reference any external variables.
   * @param {string} longtext Longer string.
   * @param {string} shorttext Shorter string.
   * @param {number} i Start index of quarter length substring within longtext.
   * @return {Array.<string>} Five element Array, containing the prefix of
   *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
   *     of shorttext and the common middle.  Or null if there was no match.
   * @private
   */
  function diff_halfMatchI_(longtext, shorttext, i) {
    // Start with a 1/4 length substring at position i as a seed.
    var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
    var j = -1;
    var best_common = '';
    var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
    while ((j = shorttext.indexOf(seed, j + 1)) != -1) {
      var prefixLength = dmp.diff_commonPrefix(longtext.substring(i),
                                               shorttext.substring(j));
      var suffixLength = dmp.diff_commonSuffix(longtext.substring(0, i),
                                               shorttext.substring(0, j));
      if (best_common.length < suffixLength + prefixLength) {
        best_common = shorttext.substring(j - suffixLength, j) +
            shorttext.substring(j, j + prefixLength);
        best_longtext_a = longtext.substring(0, i - suffixLength);
        best_longtext_b = longtext.substring(i + prefixLength);
        best_shorttext_a = shorttext.substring(0, j - suffixLength);
        best_shorttext_b = shorttext.substring(j + prefixLength);
      }
    }
    if (best_common.length * 2 >= longtext.length) {
      return [best_longtext_a, best_longtext_b,
              best_shorttext_a, best_shorttext_b, best_common];
    } else {
      return null;
    }
  }

  // First check if the second quarter is the seed for a half-match.
  var hm1 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 4));
  // Check again based on the third quarter.
  var hm2 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 2));
  var hm;
  if (!hm1 && !hm2) {
    return null;
  } else if (!hm2) {
    hm = hm1;
  } else if (!hm1) {
    hm = hm2;
  } else {
    // Both matched.  Select the longest.
    hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
  }

  // A half-match was found, sort out the return data.
  var text1_a, text1_b, text2_a, text2_b;
  if (text1.length > text2.length) {
    text1_a = hm[0];
    text1_b = hm[1];
    text2_a = hm[2];
    text2_b = hm[3];
  } else {
    text2_a = hm[0];
    text2_b = hm[1];
    text1_a = hm[2];
    text1_b = hm[3];
  }
  var mid_common = hm[4];
  return [text1_a, text1_b, text2_a, text2_b, mid_common];
};


/**
 * Reduce the number of edits by eliminating semantically trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemantic = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Number of characters that changed prior to the equality.
  var length_insertions1 = 0;
  var length_deletions1 = 0;
  // Number of characters that changed after the equality.
  var length_insertions2 = 0;
  var length_deletions2 = 0;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      equalities[equalitiesLength++] = pointer;
      length_insertions1 = length_insertions2;
      length_deletions1 = length_deletions2;
      length_insertions2 = 0;
      length_deletions2 = 0;
      lastequality = diffs[pointer][1];
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_INSERT) {
        length_insertions2 += diffs[pointer][1].length;
      } else {
        length_deletions2 += diffs[pointer][1].length;
      }
      // Eliminate an equality that is smaller or equal to the edits on both
      // sides of it.
      if (lastequality && (lastequality.length <=
          Math.max(length_insertions1, length_deletions1)) &&
          (lastequality.length <= Math.max(length_insertions2,
                                           length_deletions2))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        // Throw away the equality we just deleted.
        equalitiesLength--;
        // Throw away the previous equality (it needs to be reevaluated).
        equalitiesLength--;
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
        length_insertions1 = 0;  // Reset the counters.
        length_deletions1 = 0;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastequality = null;
        changes = true;
      }
    }
    pointer++;
  }

  // Normalize the diff.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
  this.diff_cleanupSemanticLossless(diffs);

  // Find any overlaps between deletions and insertions.
  // e.g: <del>abcxxx</del><ins>xxxdef</ins>
  //   -> <del>abc</del>xxx<ins>def</ins>
  // e.g: <del>xxxabc</del><ins>defxxx</ins>
  //   -> <ins>def</ins>xxx<del>abc</del>
  // Only extract an overlap if it is as big as the edit ahead or behind it.
  pointer = 1;
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] == DIFF_DELETE &&
        diffs[pointer][0] == DIFF_INSERT) {
      var deletion = diffs[pointer - 1][1];
      var insertion = diffs[pointer][1];
      var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
      var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
      if (overlap_length1 >= overlap_length2) {
        if (overlap_length1 >= deletion.length / 2 ||
            overlap_length1 >= insertion.length / 2) {
          // Overlap found.  Insert an equality and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, insertion.substring(0, overlap_length1)]);
          diffs[pointer - 1][1] =
              deletion.substring(0, deletion.length - overlap_length1);
          diffs[pointer + 1][1] = insertion.substring(overlap_length1);
          pointer++;
        }
      } else {
        if (overlap_length2 >= deletion.length / 2 ||
            overlap_length2 >= insertion.length / 2) {
          // Reverse overlap found.
          // Insert an equality and swap and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, deletion.substring(0, overlap_length2)]);
          diffs[pointer - 1][0] = DIFF_INSERT;
          diffs[pointer - 1][1] =
              insertion.substring(0, insertion.length - overlap_length2);
          diffs[pointer + 1][0] = DIFF_DELETE;
          diffs[pointer + 1][1] =
              deletion.substring(overlap_length2);
          pointer++;
        }
      }
      pointer++;
    }
    pointer++;
  }
};


/**
 * Look for single edits surrounded on both sides by equalities
 * which can be shifted sideways to align the edit to a word boundary.
 * e.g: The c<ins>at c</ins>ame. -> The <ins>cat </ins>came.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemanticLossless = function(diffs) {
  /**
   * Given two strings, compute a score representing whether the internal
   * boundary falls on logical boundaries.
   * Scores range from 6 (best) to 0 (worst).
   * Closure, but does not reference any external variables.
   * @param {string} one First string.
   * @param {string} two Second string.
   * @return {number} The score.
   * @private
   */
  function diff_cleanupSemanticScore_(one, two) {
    if (!one || !two) {
      // Edges are the best.
      return 6;
    }

    // Each port of this function behaves slightly differently due to
    // subtle differences in each language's definition of things like
    // 'whitespace'.  Since this function's purpose is largely cosmetic,
    // the choice has been made to use each language's native features
    // rather than force total conformity.
    var char1 = one.charAt(one.length - 1);
    var char2 = two.charAt(0);
    var nonAlphaNumeric1 = char1.match(diff_match_patch.nonAlphaNumericRegex_);
    var nonAlphaNumeric2 = char2.match(diff_match_patch.nonAlphaNumericRegex_);
    var whitespace1 = nonAlphaNumeric1 &&
        char1.match(diff_match_patch.whitespaceRegex_);
    var whitespace2 = nonAlphaNumeric2 &&
        char2.match(diff_match_patch.whitespaceRegex_);
    var lineBreak1 = whitespace1 &&
        char1.match(diff_match_patch.linebreakRegex_);
    var lineBreak2 = whitespace2 &&
        char2.match(diff_match_patch.linebreakRegex_);
    var blankLine1 = lineBreak1 &&
        one.match(diff_match_patch.blanklineEndRegex_);
    var blankLine2 = lineBreak2 &&
        two.match(diff_match_patch.blanklineStartRegex_);

    if (blankLine1 || blankLine2) {
      // Five points for blank lines.
      return 5;
    } else if (lineBreak1 || lineBreak2) {
      // Four points for line breaks.
      return 4;
    } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
      // Three points for end of sentences.
      return 3;
    } else if (whitespace1 || whitespace2) {
      // Two points for whitespace.
      return 2;
    } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
      // One point for non-alphanumeric.
      return 1;
    }
    return 0;
  }

  var pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      var equality1 = diffs[pointer - 1][1];
      var edit = diffs[pointer][1];
      var equality2 = diffs[pointer + 1][1];

      // First, shift the edit as far left as possible.
      var commonOffset = this.diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        var commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset);
        edit = commonString + edit.substring(0, edit.length - commonOffset);
        equality2 = commonString + equality2;
      }

      // Second, step character by character right, looking for the best fit.
      var bestEquality1 = equality1;
      var bestEdit = edit;
      var bestEquality2 = equality2;
      var bestScore = diff_cleanupSemanticScore_(equality1, edit) +
          diff_cleanupSemanticScore_(edit, equality2);
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0);
        edit = edit.substring(1) + equality2.charAt(0);
        equality2 = equality2.substring(1);
        var score = diff_cleanupSemanticScore_(equality1, edit) +
            diff_cleanupSemanticScore_(edit, equality2);
        // The >= encourages trailing rather than leading whitespace on edits.
        if (score >= bestScore) {
          bestScore = score;
          bestEquality1 = equality1;
          bestEdit = edit;
          bestEquality2 = equality2;
        }
      }

      if (diffs[pointer - 1][1] != bestEquality1) {
        // We have an improvement, save it back to the diff.
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1;
        } else {
          diffs.splice(pointer - 1, 1);
          pointer--;
        }
        diffs[pointer][1] = bestEdit;
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2;
        } else {
          diffs.splice(pointer + 1, 1);
          pointer--;
        }
      }
    }
    pointer++;
  }
};

// Define some regex patterns for matching boundaries.
diff_match_patch.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
diff_match_patch.whitespaceRegex_ = /\s/;
diff_match_patch.linebreakRegex_ = /[\r\n]/;
diff_match_patch.blanklineEndRegex_ = /\n\r?\n$/;
diff_match_patch.blanklineStartRegex_ = /^\r?\n\r?\n/;

/**
 * Reduce the number of edits by eliminating operationally trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupEfficiency = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Is there an insertion operation before the last equality.
  var pre_ins = false;
  // Is there a deletion operation before the last equality.
  var pre_del = false;
  // Is there an insertion operation after the last equality.
  var post_ins = false;
  // Is there a deletion operation after the last equality.
  var post_del = false;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      if (diffs[pointer][1].length < this.Diff_EditCost &&
          (post_ins || post_del)) {
        // Candidate found.
        equalities[equalitiesLength++] = pointer;
        pre_ins = post_ins;
        pre_del = post_del;
        lastequality = diffs[pointer][1];
      } else {
        // Not a candidate, and can never become one.
        equalitiesLength = 0;
        lastequality = null;
      }
      post_ins = post_del = false;
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_DELETE) {
        post_del = true;
      } else {
        post_ins = true;
      }
      /*
       * Five types to be split:
       * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
       * <ins>A</ins>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<ins>C</ins>
       * <ins>A</del>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<del>C</del>
       */
      if (lastequality && ((pre_ins && pre_del && post_ins && post_del) ||
                           ((lastequality.length < this.Diff_EditCost / 2) &&
                            (pre_ins + pre_del + post_ins + post_del) == 3))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        equalitiesLength--;  // Throw away the equality we just deleted;
        lastequality = null;
        if (pre_ins && pre_del) {
          // No changes made which could affect previous entry, keep going.
          post_ins = post_del = true;
          equalitiesLength = 0;
        } else {
          equalitiesLength--;  // Throw away the previous equality.
          pointer = equalitiesLength > 0 ?
              equalities[equalitiesLength - 1] : -1;
          post_ins = post_del = false;
        }
        changes = true;
      }
    }
    pointer++;
  }

  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * Reorder and merge like edit sections.  Merge equalities.
 * Any edit section can move as long as it doesn't cross an equality.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupMerge = function(diffs) {
  diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  var commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            // Factor out any common prefixies.
            commonlength = this.diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if ((pointer - count_delete - count_insert) > 0 &&
                  diffs[pointer - count_delete - count_insert - 1][0] ==
                  DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] +=
                    text_insert.substring(0, commonlength);
              } else {
                diffs.splice(0, 0, [DIFF_EQUAL,
                                    text_insert.substring(0, commonlength)]);
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            // Factor out any common suffixies.
            commonlength = this.diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length -
                  commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(0, text_insert.length -
                  commonlength);
              text_delete = text_delete.substring(0, text_delete.length -
                  commonlength);
            }
          }
          // Delete the offending records and add the merged ones.
          if (count_delete === 0) {
            diffs.splice(pointer - count_insert,
                count_delete + count_insert, [DIFF_INSERT, text_insert]);
          } else if (count_insert === 0) {
            diffs.splice(pointer - count_delete,
                count_delete + count_insert, [DIFF_DELETE, text_delete]);
          } else {
            diffs.splice(pointer - count_delete - count_insert,
                count_delete + count_insert, [DIFF_DELETE, text_delete],
                [DIFF_INSERT, text_insert]);
          }
          pointer = pointer - count_delete - count_insert +
                    (count_delete ? 1 : 0) + (count_insert ? 1 : 0) + 1;
        } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
          // Merge this equality with the previous one.
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
  }
  if (diffs[diffs.length - 1][1] === '') {
    diffs.pop();  // Remove the dummy entry at the end.
  }

  // Second pass: look for single edits surrounded on both sides by equalities
  // which can be shifted sideways to eliminate an equality.
  // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  var changes = false;
  pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      if (diffs[pointer][1].substring(diffs[pointer][1].length -
          diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
        // Shift the edit over the previous equality.
        diffs[pointer][1] = diffs[pointer - 1][1] +
            diffs[pointer][1].substring(0, diffs[pointer][1].length -
                                        diffs[pointer - 1][1].length);
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
          diffs[pointer + 1][1]) {
        // Shift the edit over the next equality.
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] =
            diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
            diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  // If shifts were made, the diff needs reordering and another shift sweep.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * loc is a location in text1, compute and return the equivalent location in
 * text2.
 * e.g. 'The cat' vs 'The big cat', 1->1, 5->8
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {number} loc Location within text1.
 * @return {number} Location within text2.
 */
diff_match_patch.prototype.diff_xIndex = function(diffs, loc) {
  var chars1 = 0;
  var chars2 = 0;
  var last_chars1 = 0;
  var last_chars2 = 0;
  var x;
  for (x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {  // Equality or deletion.
      chars1 += diffs[x][1].length;
    }
    if (diffs[x][0] !== DIFF_DELETE) {  // Equality or insertion.
      chars2 += diffs[x][1].length;
    }
    if (chars1 > loc) {  // Overshot the location.
      break;
    }
    last_chars1 = chars1;
    last_chars2 = chars2;
  }
  // Was the location was deleted?
  if (diffs.length != x && diffs[x][0] === DIFF_DELETE) {
    return last_chars2;
  }
  // Add the remaining character length.
  return last_chars2 + (loc - last_chars1);
};


/**
 * Convert a diff array into a pretty HTML report.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} HTML representation.
 */
diff_match_patch.prototype.diff_prettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  var pattern_para = /\n/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;')
        .replace(pattern_gt, '&gt;').replace(pattern_para, '&para;<br>');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#e6ffe6;">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="background:#ffe6e6;">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};


/**
 * Compute and return the source text (all equalities and deletions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Source text.
 */
diff_match_patch.prototype.diff_text1 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute and return the destination text (all equalities and insertions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Destination text.
 */
diff_match_patch.prototype.diff_text2 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_DELETE) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute the Levenshtein distance; the number of inserted, deleted or
 * substituted characters.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {number} Number of changes.
 */
diff_match_patch.prototype.diff_levenshtein = function(diffs) {
  var levenshtein = 0;
  var insertions = 0;
  var deletions = 0;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];
    var data = diffs[x][1];
    switch (op) {
      case DIFF_INSERT:
        insertions += data.length;
        break;
      case DIFF_DELETE:
        deletions += data.length;
        break;
      case DIFF_EQUAL:
        // A deletion and an insertion is one substitution.
        levenshtein += Math.max(insertions, deletions);
        insertions = 0;
        deletions = 0;
        break;
    }
  }
  levenshtein += Math.max(insertions, deletions);
  return levenshtein;
};


/**
 * Crush the diff into an encoded string which describes the operations
 * required to transform text1 into text2.
 * E.g. =3\t-2\t+ing  -> Keep 3 chars, delete 2 chars, insert 'ing'.
 * Operations are tab-separated.  Inserted text is escaped using %xx notation.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Delta text.
 */
diff_match_patch.prototype.diff_toDelta = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    switch (diffs[x][0]) {
      case DIFF_INSERT:
        text[x] = '+' + encodeURI(diffs[x][1]);
        break;
      case DIFF_DELETE:
        text[x] = '-' + diffs[x][1].length;
        break;
      case DIFF_EQUAL:
        text[x] = '=' + diffs[x][1].length;
        break;
    }
  }
  return text.join('\t').replace(/%20/g, ' ');
};


/**
 * Given the original text1, and an encoded string which describes the
 * operations required to transform text1 into text2, compute the full diff.
 * @param {string} text1 Source string for the diff.
 * @param {string} delta Delta text.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.diff_fromDelta = function(text1, delta) {
  var diffs = [];
  var diffsLength = 0;  // Keeping our own length var is faster in JS.
  var pointer = 0;  // Cursor in text1
  var tokens = delta.split(/\t/g);
  for (var x = 0; x < tokens.length; x++) {
    // Each token begins with a one character parameter which specifies the
    // operation of this token (delete, insert, equality).
    var param = tokens[x].substring(1);
    switch (tokens[x].charAt(0)) {
      case '+':
        try {
          diffs[diffsLength++] = [DIFF_INSERT, decodeURI(param)];
        } catch (ex) {
          // Malformed URI sequence.
          throw new Error('Illegal escape in diff_fromDelta: ' + param);
        }
        break;
      case '-':
        // Fall through.
      case '=':
        var n = parseInt(param, 10);
        if (isNaN(n) || n < 0) {
          throw new Error('Invalid number in diff_fromDelta: ' + param);
        }
        var text = text1.substring(pointer, pointer += n);
        if (tokens[x].charAt(0) == '=') {
          diffs[diffsLength++] = [DIFF_EQUAL, text];
        } else {
          diffs[diffsLength++] = [DIFF_DELETE, text];
        }
        break;
      default:
        // Blank tokens are ok (from a trailing \t).
        // Anything else is an error.
        if (tokens[x]) {
          throw new Error('Invalid diff operation in diff_fromDelta: ' +
                          tokens[x]);
        }
    }
  }
  if (pointer != text1.length) {
    throw new Error('Delta length (' + pointer +
        ') does not equal source text length (' + text1.length + ').');
  }
  return diffs;
};


//  MATCH FUNCTIONS


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc'.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 */
diff_match_patch.prototype.match_main = function(text, pattern, loc) {
  // Check for null inputs.
  if (text == null || pattern == null || loc == null) {
    throw new Error('Null input. (match_main)');
  }

  loc = Math.max(0, Math.min(loc, text.length));
  if (text == pattern) {
    // Shortcut (potentially not guaranteed by the algorithm)
    return 0;
  } else if (!text.length) {
    // Nothing to match.
    return -1;
  } else if (text.substring(loc, loc + pattern.length) == pattern) {
    // Perfect match at the perfect spot!  (Includes case of null pattern)
    return loc;
  } else {
    // Do a fuzzy compare.
    return this.match_bitap_(text, pattern, loc);
  }
};


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc' using the
 * Bitap algorithm.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 * @private
 */
diff_match_patch.prototype.match_bitap_ = function(text, pattern, loc) {
  if (pattern.length > this.Match_MaxBits) {
    throw new Error('Pattern too long for this browser.');
  }

  // Initialise the alphabet.
  var s = this.match_alphabet_(pattern);

  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Compute and return the score for a match with e errors and x location.
   * Accesses loc and pattern through being a closure.
   * @param {number} e Number of errors in match.
   * @param {number} x Location of match.
   * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
   * @private
   */
  function match_bitapScore_(e, x) {
    var accuracy = e / pattern.length;
    var proximity = Math.abs(loc - x);
    if (!dmp.Match_Distance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy;
    }
    return accuracy + (proximity / dmp.Match_Distance);
  }

  // Highest score beyond which we give up.
  var score_threshold = this.Match_Threshold;
  // Is there a nearby exact match? (speedup)
  var best_loc = text.indexOf(pattern, loc);
  if (best_loc != -1) {
    score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
    // What about in the other direction? (speedup)
    best_loc = text.lastIndexOf(pattern, loc + pattern.length);
    if (best_loc != -1) {
      score_threshold =
          Math.min(match_bitapScore_(0, best_loc), score_threshold);
    }
  }

  // Initialise the bit arrays.
  var matchmask = 1 << (pattern.length - 1);
  best_loc = -1;

  var bin_min, bin_mid;
  var bin_max = pattern.length + text.length;
  var last_rd;
  for (var d = 0; d < pattern.length; d++) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from 'loc' we can stray at this
    // error level.
    bin_min = 0;
    bin_mid = bin_max;
    while (bin_min < bin_mid) {
      if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
        bin_min = bin_mid;
      } else {
        bin_max = bin_mid;
      }
      bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
    }
    // Use the result from this iteration as the maximum for the next.
    bin_max = bin_mid;
    var start = Math.max(1, loc - bin_mid + 1);
    var finish = Math.min(loc + bin_mid, text.length) + pattern.length;

    var rd = Array(finish + 2);
    rd[finish + 1] = (1 << d) - 1;
    for (var j = finish; j >= start; j--) {
      // The alphabet (s) is a sparse hash, so the following line generates
      // warnings.
      var charMatch = s[text.charAt(j - 1)];
      if (d === 0) {  // First pass: exact match.
        rd[j] = ((rd[j + 1] << 1) | 1) & charMatch;
      } else {  // Subsequent passes: fuzzy match.
        rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) |
                (((last_rd[j + 1] | last_rd[j]) << 1) | 1) |
                last_rd[j + 1];
      }
      if (rd[j] & matchmask) {
        var score = match_bitapScore_(d, j - 1);
        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (score <= score_threshold) {
          // Told you so.
          score_threshold = score;
          best_loc = j - 1;
          if (best_loc > loc) {
            // When passing loc, don't exceed our current distance from loc.
            start = Math.max(1, 2 * loc - best_loc);
          } else {
            // Already passed loc, downhill from here on in.
            break;
          }
        }
      }
    }
    // No hope for a (better) match at greater error levels.
    if (match_bitapScore_(d + 1, loc) > score_threshold) {
      break;
    }
    last_rd = rd;
  }
  return best_loc;
};


/**
 * Initialise the alphabet for the Bitap algorithm.
 * @param {string} pattern The text to encode.
 * @return {!Object} Hash of character locations.
 * @private
 */
diff_match_patch.prototype.match_alphabet_ = function(pattern) {
  var s = {};
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] = 0;
  }
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] |= 1 << (pattern.length - i - 1);
  }
  return s;
};


//  PATCH FUNCTIONS


/**
 * Increase the context until it is unique,
 * but don't let the pattern expand beyond Match_MaxBits.
 * @param {!diff_match_patch.patch_obj} patch The patch to grow.
 * @param {string} text Source text.
 * @private
 */
diff_match_patch.prototype.patch_addContext_ = function(patch, text) {
  if (text.length == 0) {
    return;
  }
  var pattern = text.substring(patch.start2, patch.start2 + patch.length1);
  var padding = 0;

  // Look for the first and last matches of pattern in text.  If two different
  // matches are found, increase the pattern length.
  while (text.indexOf(pattern) != text.lastIndexOf(pattern) &&
         pattern.length < this.Match_MaxBits - this.Patch_Margin -
         this.Patch_Margin) {
    padding += this.Patch_Margin;
    pattern = text.substring(patch.start2 - padding,
                             patch.start2 + patch.length1 + padding);
  }
  // Add one chunk for good luck.
  padding += this.Patch_Margin;

  // Add the prefix.
  var prefix = text.substring(patch.start2 - padding, patch.start2);
  if (prefix) {
    patch.diffs.unshift([DIFF_EQUAL, prefix]);
  }
  // Add the suffix.
  var suffix = text.substring(patch.start2 + patch.length1,
                              patch.start2 + patch.length1 + padding);
  if (suffix) {
    patch.diffs.push([DIFF_EQUAL, suffix]);
  }

  // Roll back the start points.
  patch.start1 -= prefix.length;
  patch.start2 -= prefix.length;
  // Extend the lengths.
  patch.length1 += prefix.length + suffix.length;
  patch.length2 += prefix.length + suffix.length;
};


/**
 * Compute a list of patches to turn text1 into text2.
 * Use diffs if provided, otherwise compute it ourselves.
 * There are four ways to call this function, depending on what data is
 * available to the caller:
 * Method 1:
 * a = text1, b = text2
 * Method 2:
 * a = diffs
 * Method 3 (optimal):
 * a = text1, b = diffs
 * Method 4 (deprecated, use method 3):
 * a = text1, b = text2, c = diffs
 *
 * @param {string|!Array.<!diff_match_patch.Diff>} a text1 (methods 1,3,4) or
 * Array of diff tuples for text1 to text2 (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_b text2 (methods 1,4) or
 * Array of diff tuples for text1 to text2 (method 3) or undefined (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_c Array of diff tuples
 * for text1 to text2 (method 4) or undefined (methods 1,2,3).
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_make = function(a, opt_b, opt_c) {
  var text1, diffs;
  if (typeof a == 'string' && typeof opt_b == 'string' &&
      typeof opt_c == 'undefined') {
    // Method 1: text1, text2
    // Compute diffs from text1 and text2.
    text1 = /** @type {string} */(a);
    diffs = this.diff_main(text1, /** @type {string} */(opt_b), true);
    if (diffs.length > 2) {
      this.diff_cleanupSemantic(diffs);
      this.diff_cleanupEfficiency(diffs);
    }
  } else if (a && typeof a == 'object' && typeof opt_b == 'undefined' &&
      typeof opt_c == 'undefined') {
    // Method 2: diffs
    // Compute text1 from diffs.
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(a);
    text1 = this.diff_text1(diffs);
  } else if (typeof a == 'string' && opt_b && typeof opt_b == 'object' &&
      typeof opt_c == 'undefined') {
    // Method 3: text1, diffs
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_b);
  } else if (typeof a == 'string' && typeof opt_b == 'string' &&
      opt_c && typeof opt_c == 'object') {
    // Method 4: text1, text2, diffs
    // text2 is not used.
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_c);
  } else {
    throw new Error('Unknown call format to patch_make.');
  }

  if (diffs.length === 0) {
    return [];  // Get rid of the null case.
  }
  var patches = [];
  var patch = new diff_match_patch.patch_obj();
  var patchDiffLength = 0;  // Keeping our own length var is faster in JS.
  var char_count1 = 0;  // Number of characters into the text1 string.
  var char_count2 = 0;  // Number of characters into the text2 string.
  // Start with text1 (prepatch_text) and apply the diffs until we arrive at
  // text2 (postpatch_text).  We recreate the patches one by one to determine
  // context info.
  var prepatch_text = text1;
  var postpatch_text = text1;
  for (var x = 0; x < diffs.length; x++) {
    var diff_type = diffs[x][0];
    var diff_text = diffs[x][1];

    if (!patchDiffLength && diff_type !== DIFF_EQUAL) {
      // A new patch starts here.
      patch.start1 = char_count1;
      patch.start2 = char_count2;
    }

    switch (diff_type) {
      case DIFF_INSERT:
        patch.diffs[patchDiffLength++] = diffs[x];
        patch.length2 += diff_text.length;
        postpatch_text = postpatch_text.substring(0, char_count2) + diff_text +
                         postpatch_text.substring(char_count2);
        break;
      case DIFF_DELETE:
        patch.length1 += diff_text.length;
        patch.diffs[patchDiffLength++] = diffs[x];
        postpatch_text = postpatch_text.substring(0, char_count2) +
                         postpatch_text.substring(char_count2 +
                             diff_text.length);
        break;
      case DIFF_EQUAL:
        if (diff_text.length <= 2 * this.Patch_Margin &&
            patchDiffLength && diffs.length != x + 1) {
          // Small equality inside a patch.
          patch.diffs[patchDiffLength++] = diffs[x];
          patch.length1 += diff_text.length;
          patch.length2 += diff_text.length;
        } else if (diff_text.length >= 2 * this.Patch_Margin) {
          // Time for a new patch.
          if (patchDiffLength) {
            this.patch_addContext_(patch, prepatch_text);
            patches.push(patch);
            patch = new diff_match_patch.patch_obj();
            patchDiffLength = 0;
            // Unlike Unidiff, our patch lists have a rolling context.
            // http://code.google.com/p/google-diff-match-patch/wiki/Unidiff
            // Update prepatch text & pos to reflect the application of the
            // just completed patch.
            prepatch_text = postpatch_text;
            char_count1 = char_count2;
          }
        }
        break;
    }

    // Update the current character count.
    if (diff_type !== DIFF_INSERT) {
      char_count1 += diff_text.length;
    }
    if (diff_type !== DIFF_DELETE) {
      char_count2 += diff_text.length;
    }
  }
  // Pick up the leftover patch if not empty.
  if (patchDiffLength) {
    this.patch_addContext_(patch, prepatch_text);
    patches.push(patch);
  }

  return patches;
};


/**
 * Given an array of patches, return another array that is identical.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_deepCopy = function(patches) {
  // Making deep copies is hard in JavaScript.
  var patchesCopy = [];
  for (var x = 0; x < patches.length; x++) {
    var patch = patches[x];
    var patchCopy = new diff_match_patch.patch_obj();
    patchCopy.diffs = [];
    for (var y = 0; y < patch.diffs.length; y++) {
      patchCopy.diffs[y] = patch.diffs[y].slice();
    }
    patchCopy.start1 = patch.start1;
    patchCopy.start2 = patch.start2;
    patchCopy.length1 = patch.length1;
    patchCopy.length2 = patch.length2;
    patchesCopy[x] = patchCopy;
  }
  return patchesCopy;
};


/**
 * Merge a set of patches onto the text.  Return a patched text, as well
 * as a list of true/false values indicating which patches were applied.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @param {string} text Old text.
 * @return {!Array.<string|!Array.<boolean>>} Two element Array, containing the
 *      new text and an array of boolean values.
 */
diff_match_patch.prototype.patch_apply = function(patches, text) {
  if (patches.length == 0) {
    return [text, []];
  }

  // Deep copy the patches so that no changes are made to originals.
  patches = this.patch_deepCopy(patches);

  var nullPadding = this.patch_addPadding(patches);
  text = nullPadding + text + nullPadding;

  this.patch_splitMax(patches);
  // delta keeps track of the offset between the expected and actual location
  // of the previous patch.  If there are patches expected at positions 10 and
  // 20, but the first patch was found at 12, delta is 2 and the second patch
  // has an effective expected position of 22.
  var delta = 0;
  var results = [];
  for (var x = 0; x < patches.length; x++) {
    var expected_loc = patches[x].start2 + delta;
    var text1 = this.diff_text1(patches[x].diffs);
    var start_loc;
    var end_loc = -1;
    if (text1.length > this.Match_MaxBits) {
      // patch_splitMax will only provide an oversized pattern in the case of
      // a monster delete.
      start_loc = this.match_main(text, text1.substring(0, this.Match_MaxBits),
                                  expected_loc);
      if (start_loc != -1) {
        end_loc = this.match_main(text,
            text1.substring(text1.length - this.Match_MaxBits),
            expected_loc + text1.length - this.Match_MaxBits);
        if (end_loc == -1 || start_loc >= end_loc) {
          // Can't find valid trailing context.  Drop this patch.
          start_loc = -1;
        }
      }
    } else {
      start_loc = this.match_main(text, text1, expected_loc);
    }
    if (start_loc == -1) {
      // No match found.  :(
      results[x] = false;
      // Subtract the delta for this failed patch from subsequent patches.
      delta -= patches[x].length2 - patches[x].length1;
    } else {
      // Found a match.  :)
      results[x] = true;
      delta = start_loc - expected_loc;
      var text2;
      if (end_loc == -1) {
        text2 = text.substring(start_loc, start_loc + text1.length);
      } else {
        text2 = text.substring(start_loc, end_loc + this.Match_MaxBits);
      }
      if (text1 == text2) {
        // Perfect match, just shove the replacement text in.
        text = text.substring(0, start_loc) +
               this.diff_text2(patches[x].diffs) +
               text.substring(start_loc + text1.length);
      } else {
        // Imperfect match.  Run a diff to get a framework of equivalent
        // indices.
        var diffs = this.diff_main(text1, text2, false);
        if (text1.length > this.Match_MaxBits &&
            this.diff_levenshtein(diffs) / text1.length >
            this.Patch_DeleteThreshold) {
          // The end points match, but the content is unacceptably bad.
          results[x] = false;
        } else {
          this.diff_cleanupSemanticLossless(diffs);
          var index1 = 0;
          var index2;
          for (var y = 0; y < patches[x].diffs.length; y++) {
            var mod = patches[x].diffs[y];
            if (mod[0] !== DIFF_EQUAL) {
              index2 = this.diff_xIndex(diffs, index1);
            }
            if (mod[0] === DIFF_INSERT) {  // Insertion
              text = text.substring(0, start_loc + index2) + mod[1] +
                     text.substring(start_loc + index2);
            } else if (mod[0] === DIFF_DELETE) {  // Deletion
              text = text.substring(0, start_loc + index2) +
                     text.substring(start_loc + this.diff_xIndex(diffs,
                         index1 + mod[1].length));
            }
            if (mod[0] !== DIFF_DELETE) {
              index1 += mod[1].length;
            }
          }
        }
      }
    }
  }
  // Strip the padding off.
  text = text.substring(nullPadding.length, text.length - nullPadding.length);
  return [text, results];
};


/**
 * Add some padding on text start and end so that edges can match something.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} The padding string added to each side.
 */
diff_match_patch.prototype.patch_addPadding = function(patches) {
  var paddingLength = this.Patch_Margin;
  var nullPadding = '';
  for (var x = 1; x <= paddingLength; x++) {
    nullPadding += String.fromCharCode(x);
  }

  // Bump all the patches forward.
  for (var x = 0; x < patches.length; x++) {
    patches[x].start1 += paddingLength;
    patches[x].start2 += paddingLength;
  }

  // Add some padding on start of first diff.
  var patch = patches[0];
  var diffs = patch.diffs;
  if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.unshift([DIFF_EQUAL, nullPadding]);
    patch.start1 -= paddingLength;  // Should be 0.
    patch.start2 -= paddingLength;  // Should be 0.
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[0][1].length) {
    // Grow first equality.
    var extraLength = paddingLength - diffs[0][1].length;
    diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
    patch.start1 -= extraLength;
    patch.start2 -= extraLength;
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  // Add some padding on end of last diff.
  patch = patches[patches.length - 1];
  diffs = patch.diffs;
  if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.push([DIFF_EQUAL, nullPadding]);
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[diffs.length - 1][1].length) {
    // Grow last equality.
    var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
    diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  return nullPadding;
};


/**
 * Look through the patches and break up any which are longer than the maximum
 * limit of the match algorithm.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 */
diff_match_patch.prototype.patch_splitMax = function(patches) {
  var patch_size = this.Match_MaxBits;
  for (var x = 0; x < patches.length; x++) {
    if (patches[x].length1 <= patch_size) {
      continue;
    }
    var bigpatch = patches[x];
    // Remove the big old patch.
    patches.splice(x--, 1);
    var start1 = bigpatch.start1;
    var start2 = bigpatch.start2;
    var precontext = '';
    while (bigpatch.diffs.length !== 0) {
      // Create one of several smaller patches.
      var patch = new diff_match_patch.patch_obj();
      var empty = true;
      patch.start1 = start1 - precontext.length;
      patch.start2 = start2 - precontext.length;
      if (precontext !== '') {
        patch.length1 = patch.length2 = precontext.length;
        patch.diffs.push([DIFF_EQUAL, precontext]);
      }
      while (bigpatch.diffs.length !== 0 &&
             patch.length1 < patch_size - this.Patch_Margin) {
        var diff_type = bigpatch.diffs[0][0];
        var diff_text = bigpatch.diffs[0][1];
        if (diff_type === DIFF_INSERT) {
          // Insertions are harmless.
          patch.length2 += diff_text.length;
          start2 += diff_text.length;
          patch.diffs.push(bigpatch.diffs.shift());
          empty = false;
        } else if (diff_type === DIFF_DELETE && patch.diffs.length == 1 &&
                   patch.diffs[0][0] == DIFF_EQUAL &&
                   diff_text.length > 2 * patch_size) {
          // This is a large deletion.  Let it pass in one chunk.
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          empty = false;
          patch.diffs.push([diff_type, diff_text]);
          bigpatch.diffs.shift();
        } else {
          // Deletion or equality.  Only take as much as we can stomach.
          diff_text = diff_text.substring(0,
              patch_size - patch.length1 - this.Patch_Margin);
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          if (diff_type === DIFF_EQUAL) {
            patch.length2 += diff_text.length;
            start2 += diff_text.length;
          } else {
            empty = false;
          }
          patch.diffs.push([diff_type, diff_text]);
          if (diff_text == bigpatch.diffs[0][1]) {
            bigpatch.diffs.shift();
          } else {
            bigpatch.diffs[0][1] =
                bigpatch.diffs[0][1].substring(diff_text.length);
          }
        }
      }
      // Compute the head context for the next patch.
      precontext = this.diff_text2(patch.diffs);
      precontext =
          precontext.substring(precontext.length - this.Patch_Margin);
      // Append the end context for this patch.
      var postcontext = this.diff_text1(bigpatch.diffs)
                            .substring(0, this.Patch_Margin);
      if (postcontext !== '') {
        patch.length1 += postcontext.length;
        patch.length2 += postcontext.length;
        if (patch.diffs.length !== 0 &&
            patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL) {
          patch.diffs[patch.diffs.length - 1][1] += postcontext;
        } else {
          patch.diffs.push([DIFF_EQUAL, postcontext]);
        }
      }
      if (!empty) {
        patches.splice(++x, 0, patch);
      }
    }
  }
};


/**
 * Take a list of patches and return a textual representation.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} Text representation of patches.
 */
diff_match_patch.prototype.patch_toText = function(patches) {
  var text = [];
  for (var x = 0; x < patches.length; x++) {
    text[x] = patches[x];
  }
  return text.join('');
};


/**
 * Parse a textual representation of patches and return a list of Patch objects.
 * @param {string} textline Text representation of patches.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.patch_fromText = function(textline) {
  var patches = [];
  if (!textline) {
    return patches;
  }
  var text = textline.split('\n');
  var textPointer = 0;
  var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
  while (textPointer < text.length) {
    var m = text[textPointer].match(patchHeader);
    if (!m) {
      throw new Error('Invalid patch string: ' + text[textPointer]);
    }
    var patch = new diff_match_patch.patch_obj();
    patches.push(patch);
    patch.start1 = parseInt(m[1], 10);
    if (m[2] === '') {
      patch.start1--;
      patch.length1 = 1;
    } else if (m[2] == '0') {
      patch.length1 = 0;
    } else {
      patch.start1--;
      patch.length1 = parseInt(m[2], 10);
    }

    patch.start2 = parseInt(m[3], 10);
    if (m[4] === '') {
      patch.start2--;
      patch.length2 = 1;
    } else if (m[4] == '0') {
      patch.length2 = 0;
    } else {
      patch.start2--;
      patch.length2 = parseInt(m[4], 10);
    }
    textPointer++;

    while (textPointer < text.length) {
      var sign = text[textPointer].charAt(0);
      try {
        var line = decodeURI(text[textPointer].substring(1));
      } catch (ex) {
        // Malformed URI sequence.
        throw new Error('Illegal escape in patch_fromText: ' + line);
      }
      if (sign == '-') {
        // Deletion.
        patch.diffs.push([DIFF_DELETE, line]);
      } else if (sign == '+') {
        // Insertion.
        patch.diffs.push([DIFF_INSERT, line]);
      } else if (sign == ' ') {
        // Minor equality.
        patch.diffs.push([DIFF_EQUAL, line]);
      } else if (sign == '@') {
        // Start of next patch.
        break;
      } else if (sign === '') {
        // Blank line?  Whatever.
      } else {
        // WTF?
        throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
      }
      textPointer++;
    }
  }
  return patches;
};


/**
 * Class representing one patch operation.
 * @constructor
 */
diff_match_patch.patch_obj = function() {
  /** @type {!Array.<!diff_match_patch.Diff>} */
  this.diffs = [];
  /** @type {?number} */
  this.start1 = null;
  /** @type {?number} */
  this.start2 = null;
  /** @type {number} */
  this.length1 = 0;
  /** @type {number} */
  this.length2 = 0;
};


/**
 * Emmulate GNU diff's format.
 * Header: @@ -382,8 +481,9 @@
 * Indicies are printed as 1-based, not 0-based.
 * @return {string} The GNU diff string.
 */
diff_match_patch.patch_obj.prototype.toString = function() {
  var coords1, coords2;
  if (this.length1 === 0) {
    coords1 = this.start1 + ',0';
  } else if (this.length1 == 1) {
    coords1 = this.start1 + 1;
  } else {
    coords1 = (this.start1 + 1) + ',' + this.length1;
  }
  if (this.length2 === 0) {
    coords2 = this.start2 + ',0';
  } else if (this.length2 == 1) {
    coords2 = this.start2 + 1;
  } else {
    coords2 = (this.start2 + 1) + ',' + this.length2;
  }
  var text = ['@@ -' + coords1 + ' +' + coords2 + ' @@\n'];
  var op;
  // Escape the body of the patch with %xx notation.
  for (var x = 0; x < this.diffs.length; x++) {
    switch (this.diffs[x][0]) {
      case DIFF_INSERT:
        op = '+';
        break;
      case DIFF_DELETE:
        op = '-';
        break;
      case DIFF_EQUAL:
        op = ' ';
        break;
    }
    text[x + 1] = op + encodeURI(this.diffs[x][1]) + '\n';
  }
  return text.join('').replace(/%20/g, ' ');
};


// Export these global variables so that they survive Google's JS compiler.
// In a browser, 'this' will be 'window'.
// Users of node.js should 'require' the uncompressed version since Google's
// JS compiler may break the following exports for non-browser environments.
this['diff_match_patch'] = diff_match_patch;
this['DIFF_DELETE'] = DIFF_DELETE;
this['DIFF_INSERT'] = DIFF_INSERT;
this['DIFF_EQUAL'] = DIFF_EQUAL;

});

require.define("/src/core/op.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Op, isInsert, _;

  if (typeof module !== "undefined" && module !== null) {
    _ = require('underscore')._;
  }

  isInsert = function(i) {
    return (i != null) && typeof i.value === "string";
  };

  Op = (function() {

    function Op(attributes) {
      if (attributes == null) {
        attributes = {};
      }
      this.attributes = _.clone(attributes);
    }

    Op.prototype.addAttributes = function(attributes) {
      var addedAttributes, key, value;
      addedAttributes = {};
      for (key in attributes) {
        value = attributes[key];
        if (this.attributes[key] === void 0) {
          addedAttributes[key] = value;
        }
      }
      return addedAttributes;
    };

    Op.prototype.attributesMatch = function(other) {
      var otherAttributes;
      otherAttributes = other.attributes || {};
      return _.isEqual(this.attributes, otherAttributes);
    };

    Op.prototype.composeAttributes = function(attributes) {
      var resolveAttributes, that;
      that = this;
      resolveAttributes = function(oldAttrs, newAttrs) {
        var key, resolvedAttrs, value;
        if (!newAttrs) {
          return oldAttrs;
        }
        resolvedAttrs = _.clone(oldAttrs);
        for (key in newAttrs) {
          value = newAttrs[key];
          if (isInsert(that) && value === null) {
            delete resolvedAttrs[key];
          } else if (typeof value !== 'undefined') {
            if (typeof resolvedAttrs[key] === 'object' && typeof value === 'object' && _.all([resolvedAttrs[key], newAttrs[key]], (function(val) {
              return val !== null;
            }))) {
              resolvedAttrs[key] = resolveAttributes(resolvedAttrs[key], value);
            } else {
              resolvedAttrs[key] = value;
            }
          }
        }
        return resolvedAttrs;
      };
      return resolveAttributes(this.attributes, attributes);
    };

    Op.prototype.numAttributes = function() {
      return _.keys(this.attributes).length;
    };

    Op.prototype.printAttributes = function() {
      return JSON.stringify(this.attributes);
    };

    return Op;

  })();

  module.exports = Op;

}).call(this);

});

require.define("/src/core/insert.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var InsertOp, Op, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  if (typeof module !== "undefined" && module !== null) {
    _ = require('underscore')._;
  }

  Op = require('./op');

  InsertOp = (function(_super) {

    __extends(InsertOp, _super);

    InsertOp.copy = function(subject) {
      return new InsertOp(subject.value, subject.attributes);
    };

    InsertOp.isInsert = function(i) {
      return (i != null) && typeof i.value === "string";
    };

    function InsertOp(value, attributes) {
      this.value = value;
      if (attributes == null) {
        attributes = {};
      }
      this.attributes = _.clone(attributes);
    }

    InsertOp.prototype.getAt = function(start, length) {
      return new InsertOp(this.value.substr(start, length), this.attributes);
    };

    InsertOp.prototype.getLength = function() {
      return this.value.length;
    };

    InsertOp.prototype.join = function(other) {
      if (_.isEqual(this.attributes, other.attributes)) {
        return new InsertOp(this.value + second.value, this.attributes);
      } else {
        throw Error;
      }
    };

    InsertOp.prototype.split = function(offset) {
      var left, right;
      console.assert(offset <= this.value.length, "Split called with offset beyond end of insert");
      left = new InsertOp(this.value.substr(0, offset), this.attributes);
      right = new InsertOp(this.value.substr(offset), this.attributes);
      return [left, right];
    };

    InsertOp.prototype.toString = function() {
      return "{" + this.value + ", " + (this.printAttributes()) + "}";
    };

    return InsertOp;

  })(Op);

  module.exports = InsertOp;

}).call(this);

});

require.define("/src/core/retain.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Op, RetainOp, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  if (typeof module !== "undefined" && module !== null) {
    _ = require('underscore')._;
  }

  Op = require('./op');

  RetainOp = (function(_super) {

    __extends(RetainOp, _super);

    RetainOp.copy = function(subject) {
      console.assert(RetainOp.isRetain(subject), "Copy called on non-retain", subject);
      return new RetainOp(subject.start, subject.end, subject.attributes);
    };

    RetainOp.isRetain = function(r) {
      return (r != null) && typeof r.start === "number" && typeof r.end === "number";
    };

    function RetainOp(start, end, attributes) {
      this.start = start;
      this.end = end;
      if (attributes == null) {
        attributes = {};
      }
      console.assert(this.start >= 0, "RetainOp start cannot be negative!", this.start);
      console.assert(this.end >= this.start, "RetainOp end must be >= start!", this.start, this.end);
      this.attributes = _.clone(attributes);
    }

    RetainOp.prototype.getAt = function(start, length) {
      return new RetainOp(this.start + start, this.start + start + length, this.attributes);
    };

    RetainOp.prototype.getLength = function() {
      return this.end - this.start;
    };

    RetainOp.prototype.split = function(offset) {
      var left, right;
      console.assert(offset <= this.end, "Split called with offset beyond end of retain");
      left = new RetainOp(this.start, this.start + offset, this.attributes);
      right = new RetainOp(this.start + offset, this.end, this.attributes);
      return [left, right];
    };

    RetainOp.prototype.toString = function() {
      return "{{" + this.start + " - " + this.end + "), " + (this.printAttributes()) + "}";
    };

    return RetainOp;

  })(Op);

  module.exports = RetainOp;

}).call(this);

});

require.define("/src/client/tandem-core.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var TandemDelta, TandemInsertOp, TandemOp, TandemRetainOp;

  TandemDelta = require('../core/delta');

  TandemOp = require('../core/op');

  TandemInsertOp = require('../core/insert');

  TandemRetainOp = require('../core/retain');

  if (window.Tandem == null) {
    window.Tandem = {
      Delta: TandemDelta,
      Op: TandemOp,
      InsertOp: TandemInsertOp,
      RetainOp: TandemRetainOp
    };
  }

}).call(this);

});
require("/src/client/tandem-core.coffee");

})();

(function() {
  var ScribeConstants;

  ScribeConstants = {
    ALIGN_FORMATS: ['center', 'justify', 'left', 'right'],
    BLOCK_TAGS: ['ADDRESS', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'OL', 'P', 'PRE', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'],
    BREAK_TAGS: ['BR', 'HR'],
    DEFAULT_LEAF_FORMATS: {
      'background': 'white',
      'color': 'black',
      'family': 'san-serif',
      'size': 'normal'
    },
    FONT_BACKGROUNDS: ['black', 'blue', 'green', 'orange', 'purple', 'red', 'white', 'yellow'],
    FONT_COLORS: ['black', 'blue', 'green', 'orange', 'red', 'white', 'yellow'],
    FONT_FAMILIES: ['monospace', 'serif'],
    FONT_SIZES: ['huge', 'large', 'small'],
    INDENT_FORMATS: {
      'bullet': [0, 1, 2, 3, 4, 5, 6, 7, 8],
      'indent': [0, 1, 2, 3, 4, 5, 6, 7, 8],
      'list': [0, 1, 2, 3, 4, 5, 6, 7, 8]
    },
    LINE_RULES: {
      'A': {},
      'B': {},
      'BR': {},
      'BIG': {
        rename: 'span'
      },
      'CENTER': {
        rename: 'span'
      },
      'DEL': {
        rename: 's'
      },
      'EM': {
        rename: 'i'
      },
      'H1': {
        rename: 'span'
      },
      'H2': {
        rename: 'span'
      },
      'H3': {
        rename: 'span'
      },
      'H4': {
        rename: 'span'
      },
      'H5': {
        rename: 'span'
      },
      'H6': {
        rename: 'span'
      },
      'I': {},
      'INS': {
        rename: 'span'
      },
      'LI': {},
      'OL': {},
      'S': {},
      'SMALL': {
        rename: 'span'
      },
      'SPAN': {},
      'STRIKE': {
        rename: 's'
      },
      'STRONG': {
        rename: 'b'
      },
      'U': {},
      'UL': {}
    },
    LIST_TAGS: ['OL', 'UL'],
    MAX_INDENT: 9,
    MIN_INDENT: 1,
    NOBREAK_SPACE: "\uFEFF",
    SPECIAL_CLASSES: {
      ATOMIC: 'atom',
      EXTERNAL: 'ext'
    }
  };

  ScribeConstants.LINE_FORMATS = [].concat(_.keys(ScribeConstants.INDENT_FORMATS), ScribeConstants.ALIGN_FORMATS).sort();

  ScribeConstants.SPAN_FORMATS = {
    'background': ScribeConstants.FONT_BACKGROUNDS,
    'color': ScribeConstants.FONT_COLORS,
    'family': ScribeConstants.FONT_FAMILIES,
    'size': ScribeConstants.FONT_SIZES
  };

  ScribeConstants.TAG_FORMATS = {
    'bold': [true, false],
    'italic': [true, false],
    'link': [true, false],
    'strike': [true, false],
    'underline': [true, false]
  };

  window.Scribe || (window.Scribe = {});

  window.Scribe.Constants = ScribeConstants;

}).call(this);

(function() {
  var MultiCursorManager;

  MultiCursorManager = (function() {

    function MultiCursorManager(editor) {
      this.editor = editor;
      this.cursors = {};
      this.editor.renderer.addStyle({
        '#cursor-container': {
          'font-family': "'Helvetica', 'Arial', san-serif",
          'font-size': '13px',
          'line-height': '15px'
        },
        '.cursor': {
          'display': 'inline-block',
          'height': '12px',
          'position': 'absolute',
          'width': '0px'
        },
        '.cursor-name': {
          'border-bottom-right-radius': '3px',
          'border-top-left-radius': '3px',
          'border-top-right-radius': '3px',
          'color': 'white',
          'display': 'inline-block',
          'left': '-1px',
          'padding': '2px 8px',
          'position': 'absolute',
          'top': '-18px'
        },
        '.cursor-inner': {
          'display': 'inline-block',
          'width': '2px',
          'position': 'absolute',
          'height': '15px',
          'left': '-1px'
        },
        '.editor > .line:first-child .cursor-name': {
          'border-top-left-radius': '0px',
          'border-bottom-left-radius': '3px',
          'top': '15px'
        }
      });
    }

    MultiCursorManager.prototype.applyDeltaToCursors = function(delta) {
      var _this = this;
      return this.jetSyncApplyDelta(delta, (function(index, text) {
        return _this.shiftCursors(index, text.length);
      }), (function(start, end) {
        return _this.shiftCursors(start, start - end);
      }));
    };

    MultiCursorManager.prototype.shiftCursors = function(index, length) {
      var cursor, id, _ref, _results;
      _ref = this.cursors;
      _results = [];
      for (id in _ref) {
        cursor = _ref[id];
        if (cursor === void 0 || cursor.index < index) {
          continue;
        }
        if (cursor.index > index) {
          if (length > 0) {
            _results.push(this.setCursor(cursor.userId, cursor.index + length, cursor.name, cursor.color));
          } else {
            _results.push(this.setCursor(cursor.userId, cursor.index + Math.max(length, index - cursor.index), cursor.name, cursor.color));
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    MultiCursorManager.prototype.setCursor = function(userId, index, name, color) {
      var cursor, didSplit, inner, left, nameNode, position, right, span, _ref;
      cursor = this.doc.root.ownerDocument.getElementById(ScribeEditor.CURSOR_PREFIX + userId);
      if (cursor == null) {
        cursor = this.doc.root.ownerDocument.createElement('span');
        cursor.classList.add('cursor');
        cursor.classList.add(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL);
        cursor.id = ScribeEditor.CURSOR_PREFIX + userId;
        inner = this.doc.root.ownerDocument.createElement('span');
        inner.classList.add('cursor-inner');
        inner.classList.add(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL);
        nameNode = this.doc.root.ownerDocument.createElement('span');
        nameNode.classList.add('cursor-name');
        nameNode.classList.add(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL);
        nameNode.textContent = name;
        inner.style['background-color'] = nameNode.style['background-color'] = color;
        cursor.appendChild(nameNode);
        cursor.appendChild(inner);
        this.cursorContainer.appendChild(cursor);
      }
      this.cursors[userId] = {
        index: index,
        name: name,
        color: color,
        userId: userId
      };
      position = new Scribe.Position(this, index);
      _ref = Scribe.Utils.splitNode(position.leafNode, position.offset), left = _ref[0], right = _ref[1], didSplit = _ref[2];
      if ((right != null) && (right.offsetTop !== 0 || right.offsetLeft !== 0)) {
        cursor.style.top = right.parentNode;
        cursor.style.top = right.offsetTop;
        cursor.style.left = right.offsetLeft;
        if (didSplit) {
          return Scribe.Utils.mergeNodes(left, right);
        }
      } else if (left != null) {
        span = left.ownerDocument.createElement('span');
        left.parentNode.appendChild(span);
        cursor.style.top = span.offsetTop;
        cursor.style.left = span.offsetLeft;
        return span.parentNode.removeChild(span);
      } else if (right != null) {
        cursor.style.top = right.parentNode.offsetTop;
        return cursor.style.left = right.parentNode.offsetLeft;
      } else {
        return console.warn("Could not set cursor");
      }
    };

    MultiCursorManager.prototype.moveCursor = function(userId, index) {
      if (this.cursors[userId]) {
        return this.setCursor(userId, index, this.cursors[userId].name, this.cursors[userId].color);
      }
    };

    MultiCursorManager.prototype.clearCursors = function() {
      return _.each(this.doc.root.querySelectorAll('.cursor'), function(cursor) {
        return cursor.parentNode.removeChild(cursor);
      });
    };

    MultiCursorManager.prototype.removeCursor = function(userId) {
      var cursor;
      cursor = this.doc.root.ownerDocument.getElementById(ScribeEditor.CURSOR_PREFIX + userId);
      if (cursor != null) {
        return cursor.parentNode.removeChild(cursor);
      }
    };

    return MultiCursorManager;

  })();

}).call(this);

(function() {

  window.Scribe || (window.Scribe = {});

  window.Scribe.Debug = {
    getEditor: function(editor) {
      editor || (editor = Scribe.Editor.editors[0]);
      if (_.isNumber(editor)) {
        return Scribe.Editor.editors[editor];
      } else {
        return editor;
      }
    },
    getHtml: function(editor) {
      var doc;
      doc = this.getDocument(editor);
      return doc.root;
    },
    getDocument: function(editor) {
      editor = this.getEditor(editor);
      return editor.doc;
    },
    checkDocumentConsistency: function(doc, output) {
      var isConsistent, lines, nodesByLine;
      if (output == null) {
        output = false;
      }
      nodesByLine = _.map(doc.root.childNodes, function(lineNode) {
        var nodes;
        nodes = lineNode.querySelectorAll('*');
        return _.filter(nodes, function(node) {
          return node.nodeType === node.ELEMENT_NODE && !node.classList.contains(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL) && (node.nodeName === 'BR' || !(node.firstChild != null) || node.firstChild.nodeType === node.TEXT_NODE);
        });
      });
      lines = doc.lines.toArray();
      isConsistent = function() {
        var docLength, orphanedLeaf, orphanedLine,
          _this = this;
        if (lines.length !== _.values(doc.lineMap).length) {
          console.error("doc.lines and doc.lineMap differ in length", lines.length, _.values(doc.lineMap).length);
          return false;
        }
        if (_.any(lines, function(line) {
          if (!(line != null) || doc.lineMap[line.id] !== line) {
            if (line != null) {
              console.error(line, "does not match", doc.lineMap[line.id]);
            } else {
              console.error("null line");
            }
            return true;
          }
          return false;
        })) {
          return false;
        }
        orphanedLeaf = orphanedLine = null;
        if (_.any(lines, function(line) {
          return _.any(line.leaves.toArray(), function(leaf) {
            if (leaf.node.parentNode === null) {
              orphanedLeaf = leaf;
              orphanedLine = line;
              return true;
            }
            return false;
          });
        })) {
          console.error('Missing from DOM', orphanedLine, orphanedLeaf);
          return false;
        }
        if (_.any(lines, function(line) {
          var lineLength;
          lineLength = _.reduce(line.leaves.toArray(), function(count, leaf) {
            return leaf.length + count;
          }, 0);
          if (lineLength !== line.length) {
            console.error('incorrect line length', lineLength, line.length);
            return true;
          }
          return false;
        })) {
          return false;
        }
        if (_.any(lines, function(line) {
          if ((line.node.tagName === 'OL' || line.node.tagName === 'UL') && line.node.firstChild.tagName !== 'LI') {
            console.error('inconsistent bullet/list', line);
            return true;
          }
          return false;
        })) {
          return false;
        }
        docLength = _.reduce(lines, function(count, line) {
          return line.length + count;
        }, lines.length);
        if (docLength !== doc.length) {
          console.error("incorrect document length", docLength, doc.length);
          return false;
        }
        if (!doc.trailingNewline) {
          console.error("trailingNewline is false");
          return false;
        }
        if (lines.length !== nodesByLine.length) {
          console.error("doc.lines and nodesByLine differ in length", lines, nodesByLine);
          return false;
        }
        if (_.any(lines, function(line, index) {
          var calculatedLength, leafNodes, leaves, rebuiltLeaves;
          calculatedLength = _.reduce(line.node.childNodes, (function(length, node) {
            return Scribe.Utils.getNodeLength(node) + length;
          }), 0);
          if (line.length !== calculatedLength) {
            console.error(line, line.length, calculatedLength, 'differ in length');
            return true;
          }
          leaves = line.leaves.toArray();
          leafNodes = _.map(leaves, function(leaf) {
            return leaf.node;
          });
          if (!_.isEqual(leafNodes, nodesByLine[index])) {
            console.error(line, leafNodes, 'nodes differ from', nodesByLine[index]);
            return true;
          }
          leaves = _.map(leaves, function(leaf) {
            return _.pick(leaf, 'formats', 'length', 'line', 'node', 'text');
          });
          line.rebuild();
          rebuiltLeaves = _.map(line.leaves.toArray(), function(leaf) {
            return _.pick(leaf, 'formats', 'length', 'line', 'node', 'text');
          });
          if (!_.isEqual(leaves, rebuiltLeaves)) {
            console.error(leaves, 'leaves differ from', rebuiltLeaves);
            return true;
          }
          return false;
        })) {
          return false;
        }
        return true;
      };
      if (isConsistent()) {
        return true;
      } else {
        if (output) {
          console.error(doc.root);
          console.error(nodesByLine);
          console.error(lines);
          console.error(doc.lineMap);
        }
        return false;
      }
    },
    Test: {
      getRandomLength: function() {
        var rand;
        rand = Math.random();
        if (rand < 0.1) {
          return 1;
        } else if (rand < 0.6) {
          return _.random(0, 2);
        } else if (rand < 0.8) {
          return _.random(3, 4);
        } else if (rand < 0.9) {
          return _.random(5, 9);
        } else {
          return _.random(10, 50);
        }
      },
      getRandomOperation: function(editor, alphabet, formats) {
        var format, formatKeys, index, length, rand, value;
        formatKeys = _.keys(formats);
        rand = Math.random();
        if (rand < 0.2) {
          index = 0;
        } else if (rand < 0.4) {
          index = editor.doc.length;
        } else {
          index = _.random(0, editor.doc.length);
        }
        length = Scribe.Debug.Test.getRandomLength() + 1;
        rand = Math.random();
        if (rand < 0.5) {
          return {
            op: 'insertAt',
            args: [index, Scribe.Debug.Test.getRandomString(alphabet, length)]
          };
        }
        length = Math.min(length, editor.doc.length - index);
        if (length <= 0) {
          return null;
        }
        if (rand < 0.75) {
          return {
            op: 'deleteAt',
            args: [index, length]
          };
        } else {
          format = formatKeys[_.random(0, formatKeys.length - 1)];
          value = formats[format][_.random(0, formats[format].length - 1)];
          if (format === 'link' && value === true) {
            value = 'http://www.google.com';
          }
          return {
            op: 'formatAt',
            args: [index, length, format, value]
          };
        }
      },
      getRandomString: function(alphabet, length) {
        var _i, _ref, _results;
        return _.map((function() {
          _results = [];
          for (var _i = 0, _ref = length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; 0 <= _ref ? _i++ : _i--){ _results.push(_i); }
          return _results;
        }).apply(this), function() {
          return alphabet[_.random(0, alphabet.length - 1)];
        }).join('');
      }
    }
  };

}).call(this);

(function() {
  var ScribeDocument;

  ScribeDocument = (function() {

    ScribeDocument.INDENT_PREFIX = 'indent-';

    ScribeDocument.normalizeHtml = function(root, options) {
      var div,
        _this = this;
      if (options == null) {
        options = {};
      }
      if (root.childNodes.length === 0) {
        div = root.ownerDocument.createElement('div');
        return root.appendChild(div);
      }
      Scribe.Utils.groupBlocks(root);
      return _.each(_.clone(root.childNodes), function(child) {
        if (child.nodeType !== child.ELEMENT_NODE) {
          return Scribe.Utils.removeNode(child);
        } else if (options.ignoreDirty || child.classList.contains(Scribe.Line.DIRTY_CLASS) || true) {
          Scribe.Line.wrapText(child);
          return Scribe.Line.normalizeHtml(child);
        }
      });
    };

    function ScribeDocument(root) {
      this.root = root;
      this.buildLines();
    }

    ScribeDocument.prototype.appendLine = function(lineNode) {
      return this.insertLineBefore(lineNode, null);
    };

    ScribeDocument.prototype.applyToLines = function(index, length, fn) {
      var curLine, endLine, endOffset, next, startLine, startOffset, _ref, _ref1;
      _ref = this.findLineAtOffset(index), startLine = _ref[0], startOffset = _ref[1];
      _ref1 = this.findLineAtOffset(index + length), endLine = _ref1[0], endOffset = _ref1[1];
      if (startLine === endLine) {
        return fn(startLine, startOffset, endOffset - startOffset);
      } else {
        curLine = startLine.next;
        fn(startLine, startOffset, startLine.length + 1 - startOffset);
        while ((curLine != null) && curLine !== endLine) {
          next = curLine.next;
          fn(curLine, 0, curLine.length + 1);
          curLine = next;
        }
        return fn(endLine, 0, endOffset);
      }
    };

    ScribeDocument.prototype.buildLines = function() {
      this.reset();
      ScribeDocument.normalizeHtml(this.root, {
        ignoreDirty: true
      });
      return this.rebuild();
    };

    ScribeDocument.prototype.cleanNode = function(lineNode) {
      var line;
      if (lineNode.classList.contains(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL)) {
        return;
      }
      line = this.findLine(lineNode);
      if ((line != null) && this.updateLine(line)) {
        lineNode.classList.remove(Scribe.Line.DIRTY_CLASS);
        return true;
      }
      return false;
    };

    ScribeDocument.prototype.deleteText = function(index, length) {
      var firstLine, lastLine,
        _this = this;
      if (index + length === this.length && this.trailingNewline) {
        this.trailingNewline = false;
        this.length -= 1;
        length -= 1;
      }
      if (length <= 0) {
        return;
      }
      firstLine = lastLine = null;
      this.applyToLines(index, length, function(line, offset, length) {
        if (firstLine == null) {
          firstLine = line;
        }
        lastLine = line;
        if (offset === 0 && length === line.length + 1) {
          Scribe.Utils.removeNode(line.node);
        } else {
          line.deleteText(offset, length);
        }
        return _this.updateLine(line);
      });
      if (firstLine !== lastLine && this.findLine(firstLine.node) && this.findLine(lastLine.node)) {
        Scribe.Utils.mergeNodes(firstLine.node, lastLine.node);
        this.updateLine(firstLine);
        return this.removeLine(lastLine);
      }
    };

    ScribeDocument.prototype.findLeaf = function(node) {
      var line, lineNode;
      lineNode = node.parentNode;
      while ((lineNode != null) && !Scribe.Line.isLineNode(lineNode)) {
        lineNode = lineNode.parentNode;
      }
      if (!(lineNode != null)) {
        return null;
      }
      line = this.findLine(lineNode);
      return line.findLeaf(node);
    };

    ScribeDocument.prototype.findLine = function(node) {
      node = this.findLineNode(node);
      if (node != null) {
        return this.lineMap[node.id];
      } else {
        return null;
      }
    };

    ScribeDocument.prototype.findLineAtOffset = function(offset) {
      var retLine,
        _this = this;
      retLine = this.lines.first;
      _.all(this.lines.toArray(), function(line, index) {
        retLine = line;
        if (offset < line.length + 1) {
          return false;
        } else {
          if (index < _this.lines.length - 1) {
            offset -= line.length + 1;
          }
          return true;
        }
      });
      return [retLine, offset];
    };

    ScribeDocument.prototype.findLineNode = function(node) {
      while ((node != null) && !Scribe.Line.isLineNode(node)) {
        node = node.parentNode;
      }
      return node;
    };

    ScribeDocument.prototype.forceTrailingNewline = function() {
      var added;
      added = false;
      if (!this.trailingNewline) {
        if (this.lines.length > 1 && this.lines.last.length === 0) {
          Scribe.Utils.removeNode(this.lines.last.node);
          this.removeLine(this.lines.last);
        } else {
          added = true;
        }
        this.trailingNewline = true;
        this.length += 1;
      }
      return added;
    };

    ScribeDocument.prototype.formatText = function(index, length, name, value) {
      var _this = this;
      return this.applyToLines(index, length, function(line, offset, length) {
        line.formatText(offset, length, name, value);
        return _this.updateLine(line);
      });
    };

    ScribeDocument.prototype.insertLineBefore = function(newLineNode, refLine) {
      var line;
      line = new Scribe.Line(this, newLineNode);
      if (refLine !== null) {
        this.lines.insertAfter(refLine.prev, line);
      } else {
        this.lines.append(line);
      }
      this.lineMap[line.id] = line;
      this.length += line.length;
      if (this.lines.length > 1) {
        this.length += 1;
      }
      return line;
    };

    ScribeDocument.prototype.insertText = function(index, text) {
      var contents, line, line1, line2, lineOffset, textLines, _ref, _ref1,
        _this = this;
      _ref = this.findLineAtOffset(index), line = _ref[0], lineOffset = _ref[1];
      textLines = text.split("\n");
      if (index === this.length && this.trailingNewline) {
        this.trailingNewline = false;
        this.length -= 1;
        return _.each(textLines, function(textLine) {
          var contents, div;
          contents = _this.makeLineContents(textLine);
          div = _this.root.ownerDocument.createElement('div');
          _.each(contents, function(content) {
            return div.appendChild(content);
          });
          _this.root.appendChild(div);
          return _this.appendLine(div);
        });
      } else if (textLines.length === 1) {
        contents = this.makeLineContents(text);
        return this.insertContentsAt(line, lineOffset, contents);
      } else {
        _ref1 = this.insertNewlineAt(line, lineOffset), line1 = _ref1[0], line2 = _ref1[1];
        contents = this.makeLineContents(textLines[0]);
        this.insertContentsAt(line1, lineOffset, contents);
        contents = this.makeLineContents(textLines[textLines.length - 1]);
        this.insertContentsAt(line2, 0, contents);
        if (textLines.length > 2) {
          return _.each(textLines.slice(1, -1), function(lineText) {
            var lineNode;
            lineNode = _this.makeLine(lineText);
            _this.root.insertBefore(lineNode, line2.node);
            return _this.insertLineBefore(lineNode, line2);
          });
        }
      }
    };

    ScribeDocument.prototype.makeLine = function(text) {
      var contents, lineNode;
      lineNode = this.root.ownerDocument.createElement('div');
      lineNode.classList.add(Scribe.Line.CLASS_NAME);
      contents = this.makeLineContents(text);
      _.each(contents, function(content) {
        return lineNode.appendChild(content);
      });
      return lineNode;
    };

    ScribeDocument.prototype.makeLineContents = function(text) {
      var contents, strings,
        _this = this;
      strings = text.split("\t");
      contents = [];
      _.each(strings, function(str, strIndex) {
        if (str.length > 0) {
          contents.push(_this.makeText(str));
        }
        if (strIndex < strings.length - 1) {
          return contents.push(_this.makeTab());
        }
      });
      return contents;
    };

    ScribeDocument.prototype.makeTab = function() {
      var tab;
      tab = this.root.ownerDocument.createElement('span');
      tab.classList.add(Scribe.Leaf.TAB_NODE_CLASS);
      tab.classList.add(Scribe.Constants.SPECIAL_CLASSES.ATOMIC);
      tab.textContent = "\t";
      return tab;
    };

    ScribeDocument.prototype.makeText = function(text) {
      var node;
      node = this.root.ownerDocument.createElement('span');
      node.textContent = text;
      return node;
    };

    ScribeDocument.prototype.insertContentsAt = function(line, offset, contents) {
      var afterNode, beforeNode, leaf, leafOffset, parentNode, _ref, _ref1;
      if (contents.length === 0) {
        return;
      }
      _ref = line.findLeafAtOffset(offset), leaf = _ref[0], leafOffset = _ref[1];
      if (leaf.node.nodeName !== 'BR') {
        _ref1 = line.splitContents(offset), beforeNode = _ref1[0], afterNode = _ref1[1];
        parentNode = (beforeNode != null ? beforeNode.parentNode : void 0) || (afterNode != null ? afterNode.parentNode : void 0);
        _.each(contents, function(content) {
          return parentNode.insertBefore(content, afterNode);
        });
      } else {
        parentNode = leaf.node.parentNode;
        Scribe.Utils.removeNode(leaf.node);
        _.each(contents, function(content) {
          return parentNode.appendChild(content);
        });
      }
      return this.updateLine(line);
    };

    ScribeDocument.prototype.insertNewlineAt = function(line, offset) {
      var div, newLine, refLine, refLineNode;
      if (offset === 0 || offset === line.length) {
        div = this.root.ownerDocument.createElement('div');
        if (offset === 0) {
          this.root.insertBefore(div, line.node);
          newLine = this.insertLineBefore(div, line);
          return [newLine, line];
        } else {
          refLine = line.next;
          refLineNode = refLine != null ? refLine.node : null;
          this.root.insertBefore(div, refLineNode);
          newLine = this.insertLineBefore(div, refLine);
          return [line, newLine];
        }
      } else {
        newLine = this.splitLine(line, offset);
        return [line, newLine];
      }
    };

    ScribeDocument.prototype.rebuild = function() {
      var _this = this;
      this.reset();
      return _.each(this.root.childNodes, function(node) {
        return _this.appendLine(node);
      });
    };

    ScribeDocument.prototype.rebuildDirty = function() {
      var dirtyNodes,
        _this = this;
      this.root.firstChild.classList.add(Scribe.Line.DIRTY_CLASS);
      this.root.lastChild.classList.add(Scribe.Line.DIRTY_CLASS);
      dirtyNodes = _.clone(this.root.getElementsByClassName(Scribe.Line.DIRTY_CLASS));
      return _.each(dirtyNodes, function(lineNode, index) {
        var nextNode, prevNode, _results;
        _this.cleanNode(lineNode);
        prevNode = lineNode.previousSibling;
        nextNode = lineNode.nextSibling;
        while ((prevNode != null) && prevNode !== dirtyNodes[index - 1]) {
          _this.cleanNode(prevNode);
          prevNode = prevNode.previousSibling;
        }
        _results = [];
        while ((nextNode != null) && nextNode !== dirtyNodes[index + 1]) {
          _this.cleanNode(nextNode);
          _results.push(nextNode = nextNode.nextSibling);
        }
        return _results;
      });
    };

    ScribeDocument.prototype.removeLine = function(line) {
      delete this.lineMap[line.id];
      this.lines.remove(line);
      this.length -= line.length;
      if (this.lines.length >= 1) {
        return this.length -= 1;
      }
    };

    ScribeDocument.prototype.reset = function() {
      this.lines = new LinkedList();
      this.lineMap = {};
      this.length = 1;
      return this.trailingNewline = true;
    };

    ScribeDocument.prototype.splitLine = function(line, offset) {
      var lineNode1, lineNode2, _ref;
      _ref = Scribe.Utils.splitNode(line.node, offset, true), lineNode1 = _ref[0], lineNode2 = _ref[1];
      line.node = lineNode1;
      this.updateLine(line);
      return this.insertLineBefore(lineNode2, line.next);
    };

    ScribeDocument.prototype.toDelta = function() {
      var delta, formats, lines, ops;
      lines = this.lines.toArray();
      ops = _.flatten(_.map(lines, function(line, index) {
        ops = Tandem.Delta.copy(line.delta).ops;
        if (index < lines.length - 1) {
          ops.push(new Tandem.InsertOp("\n", line.formats));
        }
        return ops;
      }), true);
      formats = this.lines.last != null ? this.lines.last.formats : {};
      if (this.trailingNewline) {
        ops.push(new Tandem.InsertOp("\n", formats));
      }
      delta = new Tandem.Delta(0, this.length, ops);
      return delta;
    };

    ScribeDocument.prototype.updateDirty = function() {
      var dirtyNodes, fixLines,
        _this = this;
      dirtyNodes = this.root.ownerDocument.getElementsByClassName(Scribe.Line.DIRTY_CLASS);
      fixLines = false;
      return _.each(dirtyNodes, function(dirtyNode) {
        var line;
        line = _this.findLine(dirtyNode);
        if (line != null) {
          _this.updateLine(line);
          if (line.formats['list'] != null) {
            return fixLines = true;
          }
        }
      });
    };

    ScribeDocument.prototype.updateLine = function(line) {
      var didRebuild;
      this.length -= line.length;
      didRebuild = line.rebuild();
      this.length += line.length;
      return didRebuild;
    };

    return ScribeDocument;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.Document = ScribeDocument;

}).call(this);

(function() {
  var ScribeEditor,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ScribeEditor = (function(_super) {

    __extends(ScribeEditor, _super);

    ScribeEditor.editors = [];

    ScribeEditor.CONTAINER_ID = 'scribe-container';

    ScribeEditor.ID_PREFIX = 'editor-';

    ScribeEditor.CURSOR_PREFIX = 'cursor-';

    ScribeEditor.DEFAULTS = {
      cursor: 0,
      enabled: true,
      styles: {}
    };

    ScribeEditor.events = {
      TEXT_CHANGE: 'text-change',
      SELECTION_CHANGE: 'selection-change'
    };

    function ScribeEditor(iframeContainer, options) {
      this.iframeContainer = iframeContainer;
      this.options = _.extend(Scribe.Editor.DEFAULTS, options);
      this.id = _.uniqueId(ScribeEditor.ID_PREFIX);
      if (_.isString(this.iframeContainer)) {
        this.iframeContainer = document.getElementById(this.iframeContainer);
      }
      this.reset(true);
      if (this.options.enabled) {
        this.enable();
      }
    }

    ScribeEditor.prototype.reset = function(keepHTML) {
      var options;
      if (keepHTML == null) {
        keepHTML = false;
      }
      this.ignoreDomChanges = true;
      options = _.clone(this.options);
      options.keepHTML = keepHTML;
      this.renderer = new Scribe.Renderer(this.iframeContainer, options);
      this.contentWindow = this.renderer.iframe.contentWindow;
      this.root = this.contentWindow.document.getElementById(ScribeEditor.CONTAINER_ID);
      this.doc = new Scribe.Document(this.root);
      this.selection = new Scribe.Selection(this);
      this.keyboard = new Scribe.Keyboard(this);
      this.undoManager = new Scribe.UndoManager(this);
      this.pasteManager = new Scribe.PasteManager(this);
      this.initListeners();
      this.ignoreDomChanges = false;
      return ScribeEditor.editors.push(this);
    };

    ScribeEditor.prototype.disable = function() {
      var _this = this;
      return this.doSilently(function() {
        return _this.root.setAttribute('contenteditable', false);
      });
    };

    ScribeEditor.prototype.enable = function() {
      var _this = this;
      if (!this.root.getAttribute('contenteditable')) {
        return this.doSilently(function() {
          return _this.root.setAttribute('contenteditable', true);
        });
      }
    };

    ScribeEditor.prototype.initListeners = function() {
      var onEdit, onEditOnce, onSubtreeModified,
        _this = this;
      onEditOnce = function() {};
      onEdit = function() {
        onEditOnce = _.once(onEdit);
        if (_this.ignoreDomChanges) {
          return;
        }
        return _this.update();
      };
      onSubtreeModified = function() {
        var toCall;
        if (_this.ignoreDomChanges) {
          return;
        }
        toCall = onEditOnce;
        return _.defer(function() {
          return toCall.call(null);
        });
      };
      onEditOnce = _.once(onEdit);
      return this.root.addEventListener('DOMSubtreeModified', onSubtreeModified);
    };

    ScribeEditor.prototype.keepNormalized = function(fn) {
      fn.call(this);
      this.doc.rebuildDirty();
      return this.doc.forceTrailingNewline();
    };

    ScribeEditor.prototype.applyDelta = function(delta, external) {
      var _this = this;
      if (external == null) {
        external = true;
      }
      if (delta.startLength === 0 && this.doc.length === 1 && this.doc.trailingNewline) {
        return this.setDelta(delta);
      }
      if (delta.isIdentity()) {
        return;
      }
      return this.doSilently(function() {
        return _this.selection.preserve(function() {
          var addNewlineDelta, index, offset, oldDelta, retainDelta, retains;
          console.assert(delta.startLength === _this.doc.length, "Trying to apply delta to incorrect doc length", delta, _this.doc, _this.root);
          index = 0;
          offset = 0;
          oldDelta = _this.doc.toDelta();
          retains = [];
          _.each(delta.ops, function(op) {
            if (Tandem.Delta.isInsert(op)) {
              _this.doc.insertText(index + offset, op.value);
              retains.push(new Tandem.RetainOp(index + offset, index + offset + op.getLength(), op.attributes));
              return offset += op.getLength();
            } else if (Tandem.Delta.isRetain(op)) {
              if (op.start > index) {
                _this.doc.deleteText(index + offset, op.start - index);
                offset -= op.start - index;
              }
              retains.push(new Tandem.RetainOp(op.start + offset, op.end + offset, op.attributes));
              return index = op.end;
            } else {
              return console.warn('Unrecognized type in delta', op);
            }
          });
          if (delta.endLength < delta.startLength + offset) {
            _this.doc.deleteText(delta.endLength, delta.startLength + offset - delta.endLength);
          }
          retainDelta = new Tandem.Delta(delta.endLength, delta.endLength, retains);
          _.each(retainDelta.ops, function(op) {
            _.each(op.attributes, function(value, format) {
              if (value === null) {
                return _this.doc.formatText(op.start, op.end - op.start, format, value);
              }
            });
            return _.each(op.attributes, function(value, format) {
              if (value != null) {
                return _this.doc.formatText(op.start, op.end - op.start, format, value);
              }
            });
          });
          if (_this.doc.forceTrailingNewline()) {
            addNewlineDelta = new Tandem.Delta(delta.endLength, [new Tandem.RetainOp(0, delta.endLength), new Tandem.InsertOp("\n")]);
            _this.emit(ScribeEditor.events.TEXT_CHANGE, addNewlineDelta);
            delta = delta.compose(addNewlineDelta);
          }
          _this.undoManager.record(delta, oldDelta);
          if (!external) {
            _this.emit(ScribeEditor.events.TEXT_CHANGE, delta);
          }
          return console.assert(delta.endLength === _this.getLength(), "Applying delta resulted in incorrect end length", delta, _this.getLength());
        });
      });
    };

    ScribeEditor.prototype.deleteAt = function(index, length) {
      var _this = this;
      return this.doSilently(function() {
        return _this.selection.preserve(function() {
          return _this.trackDelta(function() {
            return _this.keepNormalized(function() {
              return _this.doc.deleteText(index, length);
            });
          });
        });
      });
    };

    ScribeEditor.prototype.doSilently = function(fn) {
      var oldIgnoreDomChange;
      oldIgnoreDomChange = this.ignoreDomChanges;
      this.ignoreDomChanges = true;
      fn();
      return this.ignoreDomChanges = oldIgnoreDomChange;
    };

    ScribeEditor.prototype.formatAt = function(index, length, name, value) {
      var _this = this;
      return this.doSilently(function() {
        return _this.selection.preserve(function() {
          return _this.trackDelta(function() {
            return _this.keepNormalized(function() {
              return _this.doc.formatText(index, length, name, value);
            });
          });
        });
      });
    };

    ScribeEditor.prototype.getDelta = function() {
      return this.doc.toDelta();
    };

    ScribeEditor.prototype.getLength = function() {
      return this.doc.length;
    };

    ScribeEditor.prototype.getSelection = function() {
      return this.selection.getRange();
    };

    ScribeEditor.prototype.insertAt = function(index, text) {
      var _this = this;
      return this.doSilently(function() {
        return _this.selection.preserve(function() {
          return _this.trackDelta(function() {
            return _this.keepNormalized(function() {
              return _this.doc.insertText(index, text);
            });
          });
        });
      });
    };

    ScribeEditor.prototype.setDelta = function(delta) {
      var oldLength;
      oldLength = delta.startLength;
      delta.startLength = this.doc.length;
      this.applyDelta(delta);
      return delta.startLength = oldLength;
    };

    ScribeEditor.prototype.setSelection = function(range) {
      return this.selection.setRange(range);
    };

    ScribeEditor.prototype.trackDelta = function(fn) {
      var compose, decompose, newDelta, oldDelta;
      oldDelta = this.doc.toDelta();
      fn();
      newDelta = this.doc.toDelta();
      decompose = newDelta.decompose(oldDelta);
      compose = oldDelta.compose(decompose);
      console.assert(compose.isEqual(newDelta), oldDelta, newDelta, decompose, compose);
      this.undoManager.record(decompose, oldDelta);
      if (!decompose.isIdentity()) {
        this.emit(ScribeEditor.events.TEXT_CHANGE, decompose);
      }
      return decompose;
    };

    ScribeEditor.prototype.update = function() {
      var _this = this;
      return this.doSilently(function() {
        return _this.selection.preserve(function() {
          return _this.trackDelta(function() {
            var lineNode, lines, newLine, _results;
            Scribe.Document.normalizeHtml(_this.root);
            lines = _this.doc.lines.toArray();
            lineNode = _this.root.firstChild;
            _.each(lines, function(line, index) {
              var newLine;
              while (line.node !== lineNode) {
                if (line.node.parentNode === _this.root) {
                  newLine = _this.doc.insertLineBefore(lineNode, line);
                  lineNode = lineNode.nextSibling;
                } else {
                  _this.doc.removeLine(line);
                  return;
                }
              }
              _this.doc.updateLine(line);
              return lineNode = lineNode.nextSibling;
            });
            _results = [];
            while (lineNode !== null) {
              newLine = _this.doc.appendLine(lineNode);
              _results.push(lineNode = lineNode.nextSibling);
            }
            return _results;
          });
        });
      });
    };

    return ScribeEditor;

  })(EventEmitter2);

  window.Scribe || (window.Scribe = {});

  window.Scribe.Editor = ScribeEditor;

}).call(this);

(function() {
  var ScribeKeyboard;

  ScribeKeyboard = (function() {

    ScribeKeyboard.KEYS = {
      BACKSPACE: 8,
      TAB: 9,
      ENTER: 13,
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40,
      DELETE: 46
    };

    ScribeKeyboard.HOTKEYS = {
      BOLD: {
        key: 'B',
        meta: true
      },
      ITALIC: {
        key: 'I',
        meta: true
      },
      UNDERLINE: {
        key: 'U',
        meta: true
      },
      UNDO: {
        key: 'Z',
        meta: true,
        shift: false
      },
      REDO: {
        key: 'Z',
        meta: true,
        shift: true
      }
    };

    ScribeKeyboard.PRINTABLE;

    function ScribeKeyboard(editor) {
      this.editor = editor;
      this.hotkeys = {};
      this.initListeners();
      this.initHotkeys();
    }

    ScribeKeyboard.prototype.initListeners = function() {
      var _this = this;
      return this.editor.root.addEventListener('keydown', function(event) {
        var prevent;
        event || (event = window.event);
        if (_this.hotkeys[event.which] != null) {
          prevent = false;
          _.each(_this.hotkeys[event.which], function(hotkey) {
            var selection;
            if ((hotkey.meta != null) && event.metaKey !== hotkey.meta) {
              return;
            }
            if ((hotkey.shift != null) && event.shiftKey !== hotkey.shift) {
              return;
            }
            _this.editor.selection.update(true);
            selection = _this.editor.getSelection();
            if (selection == null) {
              return;
            }
            prevent = true;
            return hotkey.callback.call(null, selection);
          });
        }
        if (prevent) {
          event.preventDefault();
        }
        return !prevent;
      });
    };

    ScribeKeyboard.prototype.initHotkeys = function() {
      var _this = this;
      this.addHotkey(ScribeKeyboard.KEYS.TAB, function() {
        _this.editor.selection.deleteRange();
        return _this.insertText("\t");
      });
      this.addHotkey(ScribeKeyboard.KEYS.ENTER, function() {
        _this.editor.selection.deleteRange();
        return _this.insertText("\n");
      });
      this.addHotkey(Scribe.Keyboard.HOTKEYS.BOLD, function(selection) {
        return _this.toggleFormat(selection, 'bold');
      });
      this.addHotkey(Scribe.Keyboard.HOTKEYS.ITALIC, function(selection) {
        return _this.toggleFormat(selection, 'italic');
      });
      return this.addHotkey(Scribe.Keyboard.HOTKEYS.UNDERLINE, function(selection) {
        return _this.toggleFormat(selection, 'underline');
      });
    };

    ScribeKeyboard.prototype.addHotkey = function(hotkey, callback) {
      hotkey = _.isObject(hotkey) ? _.clone(hotkey) : {
        key: hotkey
      };
      if (_.isString(hotkey.key)) {
        hotkey.key = hotkey.key.toUpperCase().charCodeAt(0);
      }
      hotkey.callback = callback;
      if (this.hotkeys[hotkey.key] == null) {
        this.hotkeys[hotkey.key] = [];
      }
      return this.hotkeys[hotkey.key].push(hotkey);
    };

    ScribeKeyboard.prototype.indent = function(selection, increment) {
      var applyIndent, lines,
        _this = this;
      lines = selection.getLines();
      applyIndent = function(line, format) {
        var indent, index;
        if (increment) {
          indent = _.isNumber(line.formats[format]) ? line.formats[format] : (line.formats[format] ? 1 : 0);
          indent += increment;
          indent = Math.min(Math.max(indent, Scribe.Constants.MIN_INDENT), Scribe.Constants.MAX_INDENT);
        } else {
          indent = false;
        }
        index = Scribe.Position.getIndex(line.node, 0);
        return _this.editor.formatAt(index, 0, format, indent);
      };
      return _.each(lines, function(line) {
        if (line.formats.bullet != null) {
          applyIndent(line, 'bullet');
        } else if (line.formats.list != null) {
          applyIndent(line, 'list');
        } else {
          applyIndent(line, 'indent');
        }
        return _this.editor.doc.updateDirty();
      });
    };

    ScribeKeyboard.prototype.onIndentLine = function(selection) {
      var intersection;
      if (!(selection != null)) {
        return false;
      }
      intersection = selection.getFormats();
      return (intersection.bullet != null) || (intersection.indent != null) || (intersection.list != null);
    };

    ScribeKeyboard.prototype.insertText = function(text) {
      var range, selection;
      selection = this.editor.getSelection();
      this.editor.insertAt(selection.start.index, text);
      range = new Scribe.Range(this.editor, selection.start.index + text.length, selection.start.index + text.length);
      return this.editor.setSelection(range);
    };

    ScribeKeyboard.prototype.toggleFormat = function(selection, format) {
      var formats;
      formats = selection.getFormats();
      return this.editor.selection.format(format, !formats[format]);
    };

    return ScribeKeyboard;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.Keyboard = ScribeKeyboard;

}).call(this);

(function() {
  var ScribeLeaf, ScribeLeafIterator,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ScribeLeaf = (function(_super) {

    __extends(ScribeLeaf, _super);

    ScribeLeaf.ID_PREFIX = 'leaf-';

    ScribeLeaf.TAB_NODE_CLASS = 'tab';

    ScribeLeaf.isLeafNode = function(node) {
      var _ref;
      if (!(node != null) || node.nodeType !== node.ELEMENT_NODE || !(node.classList != null)) {
        return false;
      }
      if (node.classList.contains(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL)) {
        return false;
      }
      if (node.tagName === 'BR') {
        return true;
      }
      if ((_ref = node.classList) != null ? _ref.contains(Scribe.Leaf.TAB_NODE_CLASS) : void 0) {
        return true;
      }
      if (node.childNodes.length === 1 && node.firstChild.nodeType === node.TEXT_NODE) {
        return true;
      }
      return false;
    };

    ScribeLeaf.isLeafParent = function(node) {
      if (!(node != null) || node.nodeType !== node.ELEMENT_NODE || !(node.classList != null)) {
        return false;
      }
      if (Scribe.Leaf.isLeafNode(node)) {
        return false;
      }
      if (node.classList.contains(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL)) {
        return false;
      }
      if (node.childNodes.length === 0) {
        return false;
      }
      return node.childNodes.length > 1 || node.firstChild.nodeType !== node.TEXT_NODE;
    };

    function ScribeLeaf(line, node, formats) {
      this.line = line;
      this.node = node;
      this.formats = _.clone(formats);
      this.id = _.uniqueId(Scribe.Leaf.ID_PREFIX);
      if (this.node.tagName === 'BR') {
        this.node.textContent = "";
      }
      this.text = this.node.textContent;
      this.length = this.text.length;
    }

    ScribeLeaf.prototype.getFormats = function(excludeDefault) {
      var formats;
      if (excludeDefault == null) {
        excludeDefault = false;
      }
      formats = excludeDefault ? {} : _.clone(Scribe.Constants.DEFAULT_LEAF_FORMATS);
      return _.extend(formats, this.formats, this.line.formats);
    };

    ScribeLeaf.prototype.getLineOffset = function() {
      return Scribe.Position.getIndex(this.node, 0, this.line.node);
    };

    ScribeLeaf.prototype.insertText = function(offset, text) {
      var node, _ref;
      this.text = this.text.substring(0, offset) + text + this.text.substring(offset);
      _ref = Scribe.Position.findDeepestNode(this.line.doc.editor, this.node, offset), node = _ref[0], offset = _ref[1];
      node.textContent = node.textContent.substring(0, offset) + text + node.textContent.substring(offset);
      return this.length = this.text.length;
    };

    return ScribeLeaf;

  })(LinkedList.Node);

  ScribeLeafIterator = (function() {

    function ScribeLeafIterator(start, end) {
      this.start = start;
      this.end = end;
      this.cur = this.start;
    }

    ScribeLeafIterator.prototype.next = function() {
      var line, ret;
      ret = this.cur;
      if (this.cur === this.end || this.cur === null) {
        this.cur = null;
      } else if (this.cur.next != null) {
        this.cur = this.cur.next;
      } else {
        line = this.cur.line.next;
        while ((line != null) && line.leaves.length === 0) {
          line = line.next;
        }
        this.cur = line != null ? line.leaves.first : null;
      }
      return ret;
    };

    ScribeLeafIterator.prototype.toArray = function() {
      var arr, itr, next;
      arr = [];
      itr = new ScribeLeafIterator(this.start, this.end);
      while (next = itr.next()) {
        arr.push(next);
      }
      return arr;
    };

    return ScribeLeafIterator;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.Leaf = ScribeLeaf;

  window.Scribe.LeafIterator = ScribeLeafIterator;

}).call(this);

(function() {
  var ScribeLine,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ScribeLine = (function(_super) {

    __extends(ScribeLine, _super);

    ScribeLine.CLASS_NAME = 'line';

    ScribeLine.DIRTY_CLASS = 'dirty';

    ScribeLine.ID_PREFIX = 'line-';

    ScribeLine.applyRules = function(root) {
      var _this = this;
      return Scribe.Utils.traversePreorder(root, 0, function(node, index) {
        var rules;
        if (node.nodeType === node.ELEMENT_NODE) {
          rules = Scribe.Constants.LINE_RULES[node.tagName];
          if (rules != null) {
            _.each(rules, function(data, rule) {
              switch (rule) {
                case 'rename':
                  return node = Scribe.Utils.switchTag(node, data);
              }
            });
          } else {
            node = Scribe.Utils.unwrap(node);
          }
        }
        return node;
      });
    };

    ScribeLine.isLineNode = function(node) {
      return (node != null) && (node.classList != null) && node.classList.contains(ScribeLine.CLASS_NAME);
    };

    ScribeLine.mergeAdjacent = function(root) {
      return Scribe.Utils.traversePreorder(root, 0, function(node) {
        var next, nextFormat, nextValue, nodeFormat, nodeValue, _ref, _ref1;
        if (node.nodeType === node.ELEMENT_NODE && !ScribeLine.isLineNode(node) && Scribe.Utils.canModify(node)) {
          next = node.nextSibling;
          if ((next != null ? next.tagName : void 0) === node.tagName && node.tagName !== 'LI' && Scribe.Utils.canModify(next)) {
            _ref = Scribe.Utils.getFormatForContainer(node), nodeFormat = _ref[0], nodeValue = _ref[1];
            _ref1 = Scribe.Utils.getFormatForContainer(next), nextFormat = _ref1[0], nextValue = _ref1[1];
            if (nodeFormat === nextFormat && nodeValue === nextValue) {
              node = Scribe.Utils.mergeNodes(node, next);
            }
          }
        }
        return node;
      });
    };

    ScribeLine.normalizeHtml = function(root) {
      if (root.childNodes.length === 1 && root.firstChild.tagName === 'BR') {
        return;
      }
      this.applyRules(root);
      this.removeNoBreak(root);
      this.removeRedundant(root);
      this.mergeAdjacent(root);
      this.wrapText(root);
      if (0 === _.reduce(root.childNodes, (function(count, node) {
        return count + (node.classList.contains(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL) ? 0 : 1);
      }), 0)) {
        if (root.tagName === 'OL' || root.tagName === 'UL') {
          root.appendChild(root.ownerDocument.createElement('li'));
          root = root.firstChild;
        }
        return root.appendChild(root.ownerDocument.createElement('br'));
      }
    };

    ScribeLine.removeNoBreak = function(root) {
      var _this = this;
      return Scribe.Utils.traversePreorder(root, 0, function(node) {
        if (node.nodeType === node.TEXT_NODE) {
          node.textContent = node.textContent.split(Scribe.Constants.NOBREAK_SPACE).join('');
        }
        return node;
      });
    };

    ScribeLine.removeRedundant = function(root) {
      var isRedudant, scribeKey,
        _this = this;
      scribeKey = _.uniqueId('_scribeFormats');
      root[scribeKey] = {};
      isRedudant = function(node) {
        var formatName, formatValue, _ref;
        if (node.nodeType === node.ELEMENT_NODE && Scribe.Utils.canModify(node)) {
          if (Scribe.Utils.getNodeLength(node) === 0) {
            return true;
          }
          _ref = Scribe.Utils.getFormatForContainer(node), formatName = _ref[0], formatValue = _ref[1];
          if (formatName != null) {
            return node.parentNode[scribeKey][formatName] != null;
          } else if (node.tagName === 'SPAN') {
            if (node.childNodes.length === 0 || !_.any(node.childNodes, function(child) {
              return child.nodeType !== child.ELEMENT_NODE;
            })) {
              return true;
            }
            if (node.previousSibling === null && node.nextSibling === null && !ScribeLine.isLineNode(node.parentNode) && node.parentNode.tagName !== 'LI') {
              return true;
            }
          }
        }
        return false;
      };
      Scribe.Utils.traversePreorder(root, 0, function(node) {
        var formatName, formatValue, _ref;
        if (isRedudant(node)) {
          node = Scribe.Utils.unwrap(node);
        }
        if (node != null) {
          node[scribeKey] = _.clone(node.parentNode[scribeKey]);
          _ref = Scribe.Utils.getFormatForContainer(node), formatName = _ref[0], formatValue = _ref[1];
          if (formatName != null) {
            node[scribeKey][formatName] = formatValue;
          }
        }
        return node;
      });
      delete root[scribeKey];
      return Scribe.Utils.traversePreorder(root, 0, function(node) {
        delete node[scribeKey];
        return node;
      });
    };

    ScribeLine.wrapText = function(root) {
      var _this = this;
      return Scribe.Utils.traversePreorder(root, 0, function(node) {
        var span;
        node.normalize();
        if (node.nodeType === node.TEXT_NODE && ((node.nextSibling != null) || (node.previousSibling != null) || node.parentNode === root || node.parentNode.tagName === 'LI')) {
          span = node.ownerDocument.createElement('span');
          Scribe.Utils.wrap(span, node);
          node = span;
        }
        return node;
      });
    };

    function ScribeLine(doc, node) {
      this.doc = doc;
      this.node = node;
      this.id = _.uniqueId(Scribe.Line.ID_PREFIX);
      this.node.id = this.id;
      this.node.classList.add(ScribeLine.CLASS_NAME);
      this.rebuild();
      ScribeLine.__super__.constructor.call(this, this.node);
    }

    ScribeLine.prototype.buildLeaves = function(node, formats) {
      var _this = this;
      return _.each(_.clone(node.childNodes), function(node) {
        var formatName, formatValue, nodeFormats, _ref;
        node.normalize();
        nodeFormats = _.clone(formats);
        _ref = Scribe.Utils.getFormatForContainer(node), formatName = _ref[0], formatValue = _ref[1];
        if (formatName != null) {
          nodeFormats[formatName] = formatValue;
        }
        if (Scribe.Leaf.isLeafNode(node)) {
          _this.leaves.append(new Scribe.Leaf(_this, node, nodeFormats));
        }
        if (Scribe.Leaf.isLeafParent(node)) {
          return _this.buildLeaves(node, nodeFormats);
        }
      });
    };

    ScribeLine.prototype.applyToContents = function(offset, length, fn) {
      var endNode, nextNode, prevNode, startNode, _ref, _ref1;
      if (length <= 0) {
        return;
      }
      _ref = this.splitContents(offset), prevNode = _ref[0], startNode = _ref[1];
      _ref1 = this.splitContents(offset + length), endNode = _ref1[0], nextNode = _ref1[1];
      return Scribe.Utils.traverseSiblings(startNode, endNode, fn);
    };

    ScribeLine.prototype.deleteText = function(offset, length) {
      return this.applyToContents(offset, length, function(node) {
        return Scribe.Utils.removeNode(node);
      });
    };

    ScribeLine.prototype.findLeaf = function(leafNode) {
      var curLeaf;
      curLeaf = this.leaves.first;
      while (curLeaf != null) {
        if (curLeaf.node === leafNode) {
          return curLeaf;
        }
        curLeaf = curLeaf.next;
      }
      return null;
    };

    ScribeLine.prototype.findLeafAtOffset = function(offset) {
      var retLeaf;
      retLeaf = this.leaves.first;
      _.all(this.leaves.toArray(), function(leaf) {
        retLeaf = leaf;
        if (offset > leaf.length && (leaf.next != null)) {
          offset -= leaf.length;
          return true;
        } else {
          return false;
        }
      });
      return [retLeaf, offset];
    };

    ScribeLine.prototype.formatText = function(offset, length, name, value) {
      var endNode, formatNode, nextNode, parentNode, prevNode, refNode, startNode, _ref, _ref1,
        _this = this;
      if (length <= 0) {
        return;
      }
      _ref = this.splitContents(offset), prevNode = _ref[0], startNode = _ref[1];
      _ref1 = this.splitContents(offset + length), endNode = _ref1[0], nextNode = _ref1[1];
      parentNode = (startNode != null ? startNode.parentNode : void 0) || (prevNode != null ? prevNode.parentNode : void 0);
      if (value && Scribe.Utils.getFormatDefault(name) !== value) {
        refNode = null;
        formatNode = Scribe.Utils.createContainerForFormat(this.doc.root.ownerDocument, name, value);
        this.applyToContents(offset, length, function(node) {
          refNode = node.nextSibling;
          node = Scribe.Utils.removeFormatFromSubtree(node, name);
          return formatNode.appendChild(node);
        });
        return this.node.insertBefore(formatNode, refNode);
      } else {
        return this.applyToContents(offset, length, function(node) {
          return Scribe.Utils.removeFormatFromSubtree(node, name);
        });
      }
    };

    ScribeLine.prototype.rebuild = function() {
      if (this.node.parentNode === this.doc.root) {
        if ((this.outerHTML != null) && this.outerHTML === this.node.outerHTML && !this.node.classList.contains(ScribeLine.DIRTY_CLASS)) {
          return false;
        }
        while ((this.leaves != null) && this.leaves.length > 0) {
          this.leaves.remove(this.leaves.first);
        }
        this.leaves = new LinkedList();
        ScribeLine.normalizeHtml(this.node);
        this.buildLeaves(this.node, {});
        this.resetContent();
      } else {
        this.doc.removeLine(this);
      }
      return true;
    };

    ScribeLine.prototype.resetContent = function() {
      var formatName, formatValue, _ref;
      this.length = _.reduce(this.leaves.toArray(), (function(length, leaf) {
        return leaf.length + length;
      }), 0);
      this.outerHTML = this.node.outerHTML;
      this.formats = {};
      _ref = Scribe.Utils.getFormatForContainer(this.node), formatName = _ref[0], formatValue = _ref[1];
      if (formatName != null) {
        this.formats[formatName] = formatValue;
      }
      this.setDirty(false);
      return this.delta = this.toDelta();
    };

    ScribeLine.prototype.setDirty = function(isDirty) {
      if (isDirty == null) {
        isDirty = true;
      }
      if (isDirty) {
        return this.node.classList.add(ScribeLine.DIRTY_CLASS);
      } else {
        return this.node.classList.remove(ScribeLine.DIRTY_CLASS);
      }
    };

    ScribeLine.prototype.splitContents = function(offset) {
      var node, _ref, _ref1;
      this.setDirty();
      _ref = Scribe.Utils.getChildAtOffset(this.node, offset), node = _ref[0], offset = _ref[1];
      if (this.node.tagName === 'OL' || this.node.tagName === 'UL') {
        _ref1 = Scribe.Utils.getChildAtOffset(node, offset), node = _ref1[0], offset = _ref1[1];
      }
      return Scribe.Utils.splitNode(node, offset);
    };

    ScribeLine.prototype.toDelta = function() {
      var delta, ops;
      ops = _.map(this.leaves.toArray(), function(leaf) {
        return new Tandem.InsertOp(leaf.text, leaf.getFormats(true));
      });
      delta = new Tandem.Delta(0, this.length, ops);
      return delta;
    };

    return ScribeLine;

  })(LinkedList.Node);

  window.Scribe || (window.Scribe = {});

  window.Scribe.Line = ScribeLine;

}).call(this);

(function() {
  var ScribePasteManager;

  ScribePasteManager = (function() {

    function ScribePasteManager(editor) {
      this.editor = editor;
      this.container = this.editor.root.ownerDocument.createElement('div');
      this.container.id = 'paste-container';
      this.container.setAttribute('contenteditable', true);
      this.editor.renderer.addStyles({
        '#paste-container': {
          'left': '-10000px',
          'position': 'fixed',
          'top': '50%'
        }
      });
      this.editor.root.parentNode.appendChild(this.container);
      this.initListeners();
    }

    ScribePasteManager.prototype.initListeners = function() {
      var _this = this;
      return this.editor.root.addEventListener('paste', function() {
        var docLength, selection;
        _this.editor.selection.deleteRange();
        selection = _this.editor.getSelection();
        if (selection == null) {
          return;
        }
        docLength = _this.editor.doc.length;
        _this.container.innerHTML = "";
        _this.container.focus();
        return _.defer(function() {
          var delta, doc, lengthAdded, oldDelta;
          Scribe.Utils.removeExternal(_this.container);
          Scribe.Utils.removeStyles(_this.container);
          doc = new Scribe.Document(_this.container);
          doc.trailingNewline = false;
          doc.length -= 1;
          delta = doc.toDelta();
          if (selection.start.index > 0) {
            delta.ops.unshift(new Tandem.RetainOp(0, selection.start.index));
          }
          if (selection.start.index < docLength) {
            delta.ops.push(new Tandem.RetainOp(selection.start.index, docLength));
          }
          delta.endLength += docLength;
          delta.startLength = docLength;
          oldDelta = _this.editor.doc.toDelta();
          _this.editor.applyDelta(delta, false);
          _this.editor.root.focus();
          lengthAdded = Math.max(0, _this.editor.doc.length - docLength);
          return _this.editor.setSelection(new Scribe.Range(_this.editor, selection.start.index + lengthAdded, selection.start.index + lengthAdded));
        });
      });
    };

    return ScribePasteManager;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.PasteManager = ScribePasteManager;

}).call(this);

(function() {
  var ScribePosition;

  ScribePosition = (function() {

    ScribePosition.findDeepestNode = function(editor, node, offset) {
      var isLineNode, nodeLength;
      isLineNode = Scribe.Line.isLineNode(node);
      nodeLength = Scribe.Utils.getNodeLength(node);
      if (isLineNode && offset < nodeLength) {
        return ScribePosition.findDeepestNode(editor, node.firstChild, Math.min(offset, nodeLength));
      } else if (offset < nodeLength) {
        if (node.firstChild != null) {
          return ScribePosition.findDeepestNode(editor, node.firstChild, offset);
        } else {
          return [node, offset];
        }
      } else if (node.nextSibling != null) {
        offset -= nodeLength;
        return ScribePosition.findDeepestNode(editor, node.nextSibling, offset);
      } else if (node.lastChild != null) {
        return ScribePosition.findDeepestNode(editor, node.lastChild, Scribe.Utils.getNodeLength(node.lastChild));
      } else {
        return [node, offset];
      }
    };

    ScribePosition.findLeafNode = function(editor, node, offset) {
      var _ref;
      _ref = ScribePosition.findDeepestNode(editor, node, offset), node = _ref[0], offset = _ref[1];
      if (node.nodeType === node.TEXT_NODE) {
        offset = Scribe.Position.getIndex(node, offset, node.parentNode);
        node = node.parentNode;
      }
      return [node, offset];
    };

    ScribePosition.getIndex = function(node, index, offsetNode) {
      if (offsetNode == null) {
        offsetNode = null;
      }
      while (node !== offsetNode && (node != null ? node.id : void 0) !== Scribe.Editor.CONTAINER_ID) {
        while (node.previousSibling != null) {
          node = node.previousSibling;
          index += Scribe.Utils.getNodeLength(node);
        }
        node = node.parentNode;
      }
      return index;
    };

    function ScribePosition(editor, leafNode, offset) {
      var _ref;
      this.editor = editor;
      this.leafNode = leafNode;
      this.offset = offset;
      if (_.isNumber(this.leafNode)) {
        this.offset = this.index = this.leafNode;
        this.leafNode = this.editor.root.firstChild;
      } else {
        this.index = ScribePosition.getIndex(this.leafNode, this.offset);
      }
      _ref = ScribePosition.findLeafNode(this.editor, this.leafNode, this.offset), this.leafNode = _ref[0], this.offset = _ref[1];
    }

    ScribePosition.prototype.getLeaf = function() {
      if (this.leaf != null) {
        return this.leaf;
      }
      this.leaf = this.editor.doc.findLeaf(this.leafNode);
      return this.leaf;
    };

    return ScribePosition;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.Position = ScribePosition;

}).call(this);

(function() {
  var ScribeRange;

  rangy.init();

  ScribeRange = (function() {

    function ScribeRange(editor, start, end) {
      this.editor = editor;
      this.start = start;
      this.end = end;
      if (_.isNumber(this.start)) {
        this.start = new Scribe.Position(this.editor, this.start);
      }
      if (_.isNumber(this.end)) {
        this.end = new Scribe.Position(this.editor, this.end);
      }
    }

    ScribeRange.prototype.equals = function(range) {
      if (range == null) {
        return false;
      }
      return range.start.leafNode === this.start.leafNode && range.end.leafNode === this.end.leafNode && range.start.offset === this.start.offset && range.end.offset === this.end.offset;
    };

    ScribeRange.prototype.getFormats = function() {
      var endLeaf, formats, leaves, startLeaf;
      if (this.formats != null) {
        return this.formats;
      }
      startLeaf = this.start.getLeaf();
      endLeaf = this.end.getLeaf();
      if (!(startLeaf != null) || !(endLeaf != null)) {
        return {};
      }
      if (this.isCollapsed()) {
        return startLeaf.getFormats();
      }
      leaves = this.getLeaves();
      if (leaves.length > 1 && this.end.offset === 0) {
        leaves.pop();
      }
      if (leaves.length > 1 && this.start.offset === leaves[0].length) {
        leaves.splice(0, 1);
      }
      formats = leaves.length > 0 ? leaves[0].getFormats() : {};
      _.all(leaves, function(leaf) {
        var leafFormats;
        leafFormats = leaf.getFormats();
        _.each(formats, function(value, key) {
          if (!leafFormats[key]) {
            return delete formats[key];
          } else if (leafFormats[key] !== value) {
            if (!_.isArray(value)) {
              formats[key] = [value];
            }
            return formats[key].push(leafFormats[key]);
          }
        });
        return _.keys(formats).length > 0;
      });
      _.each(formats, function(value, key) {
        if (_.isArray(value)) {
          return formats[key] = _.uniq(value);
        }
      });
      this.formats = formats;
      return formats;
    };

    ScribeRange.prototype.getLeafNodes = function() {
      var nodes, range;
      range = this.getRangy();
      if (range.collapsed) {
        return [this.start.leafNode];
      } else {
        nodes = _.map(range.getNodes([3]), function(node) {
          return node.parentNode;
        });
        if (nodes[nodes.length - 1] !== this.end.leafNode || this.end.offset === 0) {
          nodes.pop();
        }
        return nodes;
      }
    };

    ScribeRange.prototype.getLeaves = function() {
      var arr, itr;
      itr = new Scribe.LeafIterator(this.start.getLeaf(), this.end.getLeaf());
      arr = itr.toArray();
      return arr;
    };

    ScribeRange.prototype.getLineNodes = function() {
      var endLine, lines, startLine;
      startLine = this.editor.doc.findLineNode(this.start.leafNode);
      endLine = this.editor.doc.findLineNode(this.end.leafNode);
      if (startLine === endLine) {
        return [startLine];
      }
      lines = [];
      while (startLine !== endLine) {
        lines.push(startLine);
        startLine = startLine.nextSibling;
      }
      lines.push(endLine);
      return lines;
    };

    ScribeRange.prototype.getLines = function() {
      var _this = this;
      return _.map(this.getLineNodes(), function(lineNode) {
        return _this.editor.doc.findLine(lineNode);
      });
    };

    ScribeRange.prototype.getRangy = function() {
      var range;
      range = rangy.createRangyRange(this.editor.contentWindow);
      if (this.start.leafNode.nodeName !== 'BR' && (this.start.leafNode.firstChild != null)) {
        range.setStart(this.start.leafNode.firstChild, this.start.offset);
      } else {
        range.setStart(this.start.leafNode, 0);
      }
      if (this.end.leafNode.nodeName !== 'BR' && (this.end.leafNode.firstChild != null)) {
        range.setEnd(this.end.leafNode.firstChild, this.end.offset);
      } else {
        range.setEnd(this.end.leafNode, 0);
      }
      return range;
    };

    ScribeRange.prototype.getText = function() {
      var leaves, line,
        _this = this;
      leaves = this.getLeaves();
      if (leaves.length === 0) {
        return "";
      }
      line = leaves[0].line;
      return _.map(leaves, function(leaf) {
        var part;
        part = leaf.text;
        if (leaf === _this.end.getLeaf()) {
          part = part.substring(0, _this.end.offset);
        }
        if (leaf === _this.start.getLeaf()) {
          part = part.substring(_this.start.offset);
        }
        if (line !== leaf.line) {
          part = "\n" + part;
          line = leaf.line;
        }
        return part;
      }).join('');
    };

    ScribeRange.prototype.isCollapsed = function() {
      return this.start.leafNode === this.end.leafNode && this.start.offset === this.end.offset;
    };

    return ScribeRange;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.Range = ScribeRange;

}).call(this);

(function() {
  var ScribeRenderer;

  ScribeRenderer = (function() {

    ScribeRenderer.DEFAULTS = {
      keepHTML: false
    };

    ScribeRenderer.DEFAULT_STYLES = {
      '.editor': {
        'cursor': 'text',
        'font-family': "'Helvetica', 'Arial', san-serif",
        'font-size': '13px',
        'line-height': '15px',
        'min-height': '100%',
        'outline': 'none',
        'padding': '10px 15px',
        'tab-size': '4',
        'white-space': 'pre-wrap'
      },
      'html': {
        'height': '100%'
      },
      'body': {
        'height': '100%',
        'margin': '0px',
        'padding': '0px'
      },
      'a': {
        'text-decoration': 'underline'
      },
      'b': {
        'font-weight': 'bold'
      },
      'i': {
        'font-style': 'italic'
      },
      's': {
        'text-decoration': 'line-through'
      },
      'u': {
        'text-decoration': 'underline'
      },
      'ol': {
        'margin': '0px',
        'padding': '0px'
      },
      'ul': {
        'list-style-type': 'disc',
        'margin': '0px',
        'padding': '0px'
      },
      'ol.indent-1': {
        'list-style-type': 'decimal'
      },
      'ol.indent-2': {
        'list-style-type': 'lower-alpha'
      },
      'ol.indent-3': {
        'list-style-type': 'lower-roman'
      },
      'ol.indent-4': {
        'list-style-type': 'decimal'
      },
      'ol.indent-5': {
        'list-style-type': 'lower-alpha'
      },
      'ol.indent-6': {
        'list-style-type': 'lower-roman'
      },
      'ol.indent-7': {
        'list-style-type': 'decimal'
      },
      'ol.indent-8': {
        'list-style-type': 'lower-alpha'
      },
      'ol.indent-9': {
        'list-style-type': 'lower-roman'
      },
      '.background-black': {
        'background-color': 'black'
      },
      '.background-red': {
        'background-color': 'red'
      },
      '.background-orange': {
        'background-color': 'orange'
      },
      '.background-yellow': {
        'background-color': 'yellow'
      },
      '.background-green': {
        'background-color': 'green'
      },
      '.background-blue': {
        'background-color': 'blue'
      },
      '.background-purple': {
        'background-color': 'purple'
      },
      '.color-white': {
        'color': 'white'
      },
      '.color-red': {
        'color': 'red'
      },
      '.color-orange': {
        'color': 'orange'
      },
      '.color-yellow': {
        'color': 'yellow'
      },
      '.color-green': {
        'color': 'green'
      },
      '.color-blue': {
        'color': 'blue'
      },
      '.color-purple': {
        'color': 'purple'
      },
      '.family-monospace': {
        'font-family': "'Courier New', monospace"
      },
      '.family-serif': {
        'font-family': "'Times New Roman', serif"
      },
      '.size-huge': {
        'font-size': '32px',
        'line-height': '36px'
      },
      '.size-large': {
        'font-size': '18px',
        'line-height': '22px'
      },
      '.size-small': {
        'font-size': '10px',
        'line-height': '12px'
      },
      '.indent-1': {
        'margin-left': '2em'
      },
      '.indent-2': {
        'margin-left': '4em'
      },
      '.indent-3': {
        'margin-left': '6em'
      },
      '.indent-4': {
        'margin-left': '8em'
      },
      '.indent-5': {
        'margin-left': '10em'
      },
      '.indent-6': {
        'margin-left': '12em'
      },
      '.indent-7': {
        'margin-left': '14em'
      },
      '.indent-8': {
        'margin-left': '16em'
      },
      '.indent-9': {
        'margin-left': '18em'
      },
      '.tab': {
        'display': 'inline-block',
        'margin': '0px'
      }
    };

    ScribeRenderer.objToCss = function(obj) {
      return _.map(obj, function(value, key) {
        var innerStr;
        innerStr = _.map(value, function(innerValue, innerKey) {
          return "" + innerKey + ": " + innerValue + ";";
        }).join(' ');
        return "" + key + " { " + innerStr + " }";
      }).join("\n");
    };

    function ScribeRenderer(container, options) {
      this.container = container;
      this.options = _.extend(Scribe.Renderer.DEFAULTS, options);
      this.createFrame();
    }

    ScribeRenderer.prototype.addStyles = function(styles) {
      var css, doc, head, style;
      doc = this.iframe.contentWindow.document;
      head = doc.getElementsByTagName('head')[0];
      style = doc.createElement('style');
      style.type = 'text/css';
      css = Scribe.Renderer.objToCss(styles);
      if (style.styleSheet != null) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(doc.createTextNode(css));
      }
      return head.appendChild(style);
    };

    ScribeRenderer.prototype.createFrame = function() {
      var contentContainer, doc, html, styles;
      html = this.container.innerHTML;
      this.container.innerHTML = '';
      this.iframe = this.container.ownerDocument.createElement('iframe');
      this.iframe.frameborder = 0;
      this.iframe.src = 'javascript:;';
      this.iframe.height = this.iframe.width = '100%';
      this.container.appendChild(this.iframe);
      doc = this.iframe.contentWindow.document;
      styles = _.map(this.options.styles, function(value, key) {
        var obj;
        obj = Scribe.Renderer.DEFAULT_STYLES[key] || {};
        return _.extend(obj, value);
      });
      styles = _.extend(Scribe.Renderer.DEFAULT_STYLES, styles);
      this.addStyles(styles);
      contentContainer = doc.createElement('div');
      contentContainer.id = Scribe.Editor.CONTAINER_ID;
      contentContainer.classList.add('editor');
      doc.body.appendChild(contentContainer);
      if (this.options.keepHTML) {
        return contentContainer.innerHTML = html;
      }
    };

    return ScribeRenderer;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.Renderer = ScribeRenderer;

}).call(this);

(function() {
  var ScribeSelection;

  ScribeSelection = (function() {

    function ScribeSelection(editor) {
      this.editor = editor;
      this.range = null;
      this.initListeners();
    }

    ScribeSelection.prototype.initListeners = function() {
      var checkUpdate, keyUpdate,
        _this = this;
      checkUpdate = function() {
        return _this.update();
      };
      keyUpdate = function(event) {
        if (Scribe.Keyboard.KEYS.LEFT <= event.which && event.which <= Scribe.Keyboard.KEYS.DOWN) {
          return checkUpdate();
        }
      };
      this.editor.root.addEventListener('keyup', keyUpdate);
      return this.editor.root.addEventListener('mouseup', checkUpdate);
    };

    ScribeSelection.prototype.format = function(name, value) {
      var end, formats, start;
      this.update();
      if (!this.range) {
        return;
      }
      start = this.range.start.index;
      end = this.range.end.index;
      formats = this.range.getFormats();
      if (end > start) {
        this.editor.formatAt(start, end - start, name, value);
      }
      formats[name] = value;
      this.range.formats = formats;
      this.editor.emit(Scribe.Editor.events.SELECTION_CHANGE, this.range);
      return this.setRange(new Scribe.Range(this.editor, start, end));
    };

    ScribeSelection.prototype.deleteRange = function() {
      this.update();
      if (this.range.isCollapsed()) {
        return false;
      }
      this.editor.deleteAt(this.range.start.index, this.range.end.index - this.range.start.index);
      this.update();
      return this.range;
    };

    ScribeSelection.prototype.getNative = function() {
      var anchorNode, anchorOffset, focusNode, focusOffset, rangySel, selection, _ref, _ref1;
      rangySel = rangy.getSelection(this.editor.contentWindow);
      selection = window.getSelection();
      if (!((rangySel.anchorNode != null) && (rangySel.focusNode != null))) {
        return null;
      }
      if (!rangySel.isBackwards()) {
        _ref = [rangySel.anchorNode, rangySel.anchorOffset, rangySel.focusNode, rangySel.focusOffset], anchorNode = _ref[0], anchorOffset = _ref[1], focusNode = _ref[2], focusOffset = _ref[3];
      } else {
        _ref1 = [rangySel.anchorNode, rangySel.anchorOffset, rangySel.focusNode, rangySel.focusOffset], focusNode = _ref1[0], focusOffset = _ref1[1], anchorNode = _ref1[2], anchorOffset = _ref1[3];
      }
      return {
        anchorNode: anchorNode,
        anchorOffset: anchorOffset,
        focusNode: focusNode,
        focusOffset: focusOffset
      };
    };

    ScribeSelection.prototype.getRange = function() {
      var end, nativeSel, start;
      nativeSel = this.getNative();
      if (nativeSel == null) {
        return null;
      }
      start = new Scribe.Position(this.editor, nativeSel.anchorNode, nativeSel.anchorOffset);
      end = new Scribe.Position(this.editor, nativeSel.focusNode, nativeSel.focusOffset);
      return new Scribe.Range(this.editor, start, end);
    };

    ScribeSelection.prototype.preserve = function(fn) {
      var savedSel;
      if (this.range != null) {
        savedSel = this.save();
        fn.call(null);
        return this.restore(savedSel);
      } else {
        return fn.call(null);
      }
    };

    ScribeSelection.prototype.restore = function(savedSel) {
      rangy.restoreSelection(savedSel, false);
      return this.update(true);
    };

    ScribeSelection.prototype.save = function() {
      var savedSel;
      savedSel = rangy.saveSelection(this.editor.contentWindow);
      _.each(savedSel.rangeInfos, function(rangeInfo) {
        return _.each([rangeInfo.startMarkerId, rangeInfo.endMarkerId, rangeInfo.markerId], function(markerId) {
          var marker;
          marker = rangeInfo.document.getElementById(markerId);
          if ((marker != null ? marker.classList : void 0) != null) {
            return marker.classList.add(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL);
          }
        });
      });
      return savedSel;
    };

    ScribeSelection.prototype.setRange = function(range, silent) {
      var rangySel, rangySelRange;
      this.range = range;
      if (silent == null) {
        silent = false;
      }
      rangySel = rangy.getSelection(this.editor.contentWindow);
      if (this.range != null) {
        rangySelRange = this.range.getRangy();
        rangySel.setSingleRange(rangySelRange);
      } else {
        rangySel.removeAllRanges();
      }
      if (!silent) {
        return this.editor.emit(Scribe.Editor.events.SELECTION_CHANGE, this.range);
      }
    };

    ScribeSelection.prototype.setRangeNative = function(nativeSel) {
      var range, rangySel;
      rangySel = rangy.getSelection(this.editor.contentWindow);
      range = rangy.createRangyRange(this.editor.contentWindow);
      range.setStart(nativeSel.anchorNode, nativeSel.anchorOffset);
      range.setEnd(nativeSel.focusNode, nativeSel.focusOffset);
      return rangySel.setSingleRange(range);
    };

    ScribeSelection.prototype.update = function(silent) {
      var range, _ref;
      if (silent == null) {
        silent = false;
      }
      range = this.getRange();
      if (!((range === this.range) || ((_ref = this.range) != null ? _ref.equals(range) : void 0))) {
        if (!silent) {
          this.editor.emit(Scribe.Editor.events.SELECTION_CHANGE, range);
        }
        return this.range = range;
      }
    };

    return ScribeSelection;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.Selection = ScribeSelection;

}).call(this);

(function() {
  var ScribeUndoManager;

  ScribeUndoManager = (function() {

    ScribeUndoManager.DEFAULTS = {
      delay: 1000
    };

    ScribeUndoManager.computeUndo = function(changeDelta, originalDelta) {
      var deletedDeltas, index, offset, ops;
      index = offset = 0;
      ops = [];
      _.each(changeDelta.ops, function(op) {
        var deletedOps, length, start;
        if (Tandem.Delta.isInsert(op)) {
          return offset += op.getLength();
        } else if (Tandem.Delta.isRetain(op)) {
          start = index + offset;
          if (op.start > index) {
            length = op.start - index;
            deletedOps = originalDelta.getOpsAt(index, length);
            ops = ops.concat(deletedOps);
            offset -= length;
          }
          ops.push(new Tandem.RetainOp(start, start + op.getLength(), op.attributes));
          return index = op.end;
        } else {
          return console.error("Unrecognized type in op", op);
        }
      });
      if (changeDelta.endLength < changeDelta.startLength + offset) {
        deletedDeltas = originalDelta.getOpsAt(changeDelta.endLength - offset, changeDelta.startLength - changeDelta.endLength + offset);
        ops = ops.concat(deletedDeltas);
      }
      return new Tandem.Delta(changeDelta.endLength, changeDelta.startLength, ops);
    };

    ScribeUndoManager.getLastChangeIndex = function(delta) {
      var index, lastChangeIndex, offset;
      lastChangeIndex = index = offset = 0;
      _.each(delta.ops, function(op) {
        if (Tandem.Delta.isInsert(op)) {
          offset += op.getLength();
          return lastChangeIndex = index + offset;
        } else if (Tandem.Delta.isRetain(op)) {
          if (op.start > index) {
            lastChangeIndex = index + offset;
            offset -= op.start - index;
          }
          return index = op.end;
        }
      });
      if (delta.endLength < delta.startLength + offset) {
        lastChangeIndex = delta.endLength;
      }
      return lastChangeIndex;
    };

    function ScribeUndoManager(editor, options) {
      this.editor = editor;
      if (options == null) {
        options = {};
      }
      this.undoStack = [];
      this.redoStack = [];
      this.options = _.extend(ScribeUndoManager.DEFAULTS, options);
      this.lastRecorded = 0;
      this.initListeners();
    }

    ScribeUndoManager.prototype.initListeners = function() {
      var _this = this;
      this.editor.keyboard.addHotkey(Scribe.Keyboard.HOTKEYS.UNDO, function() {
        return _this.undo();
      });
      return this.editor.keyboard.addHotkey(Scribe.Keyboard.HOTKEYS.REDO, function() {
        return _this.redo();
      });
    };

    ScribeUndoManager.prototype.record = function(changeDelta, oldDelta) {
      var change, timestamp, undoDelta;
      if (changeDelta.isIdentity(changeDelta)) {
        return;
      }
      this.redoStack = [];
      undoDelta = ScribeUndoManager.computeUndo(changeDelta, oldDelta);
      timestamp = new Date().getTime();
      if (this.lastRecorded + this.options.delay > timestamp && this.undoStack.length > 0) {
        change = this.undoStack.pop();
        undoDelta = undoDelta.compose(change.undo.delta);
        changeDelta = change.redo.delta.compose(changeDelta);
      } else {
        this.lastRecorded = timestamp;
      }
      return this.undoStack.push({
        undo: {
          cursor: ScribeUndoManager.getLastChangeIndex(undoDelta),
          delta: undoDelta
        },
        redo: {
          cursor: ScribeUndoManager.getLastChangeIndex(changeDelta),
          delta: changeDelta
        }
      });
    };

    ScribeUndoManager.prototype.redo = function() {
      var change;
      if (this.redoStack.length > 0) {
        change = this.redoStack.pop();
        this.editor.applyDelta(change.redo.delta);
        this.editor.setSelection(new Scribe.Range(this.editor, change.redo.cursor, change.redo.cursor));
        return this.undoStack.push(change);
      }
    };

    ScribeUndoManager.prototype.undo = function() {
      var change;
      if (this.undoStack.length > 0) {
        change = this.undoStack.pop();
        this.editor.applyDelta(change.undo.delta);
        this.editor.setSelection(new Scribe.Range(this.editor, change.undo.cursor, change.undo.cursor));
        return this.redoStack.push(change);
      }
    };

    return ScribeUndoManager;

  })();

  window.Scribe || (window.Scribe = {});

  window.Scribe.UndoManager = ScribeUndoManager;

}).call(this);

(function() {
  var ScribeUtils,
    __slice = [].slice;

  ScribeUtils = {
    canModify: function(node) {
      return !node.classList.contains(Scribe.Constants.SPECIAL_CLASSES.ATOMIC) && !node.classList.contains(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL);
    },
    canRemove: function(node) {
      return !node.classList.contains(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL);
    },
    cleanHtml: function(html, keepIdClass) {
      if (keepIdClass == null) {
        keepIdClass = false;
      }
      html = html.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
      html = html.replace(/>\s\s+</gi, '><');
      if (keepIdClass !== true) {
        html = html.replace(/\ (class|id)="[a-z0-9\-_]+"/gi, '');
      }
      html = html.replace(/<br><\/br>/, '<br>');
      return html;
    },
    createContainerForFormat: function(doc, name, value) {
      var link, span;
      switch (name) {
        case 'bold':
          return doc.createElement('b');
        case 'italic':
          return doc.createElement('i');
        case 'strike':
          return doc.createElement('s');
        case 'underline':
          return doc.createElement('u');
        case 'link':
          link = doc.createElement('a');
          if (!value.match(/https?:\/\//)) {
            value = 'https://' + value;
          }
          link.href = value;
          if (link.protocol !== 'http:' && link.protocol !== 'https:') {
            link.href = 'about:blank';
          }
          link.title = link.href;
          return link;
        default:
          span = doc.createElement('span');
          span.classList.add("" + name + "-" + value);
          return span;
      }
    },
    cloneAncestors: function(node, limitingAncestor) {
      var clone, parentClone;
      clone = node.cloneNode(false);
      node = node.parentNode;
      while ((node != null) && node !== limitingAncestor) {
        parentClone = node.cloneNode(false);
        parentClone.appendChild(clone);
        clone = parentClone;
        node = node.parentNode;
      }
      return clone;
    },
    extractNodes: function(startLineNode, startOffset, endLineNode, endOffset) {
      var fragment, leftEnd, leftStart, next, rightEnd, rightStart, _ref, _ref1;
      _ref = Scribe.Utils.splitNode(startLineNode, startOffset, true), leftStart = _ref[0], rightStart = _ref[1];
      if (startLineNode === endLineNode) {
        endLineNode = rightStart;
        if ((leftStart != null) && startLineNode !== rightStart) {
          endOffset -= startOffset;
        }
      }
      _ref1 = Scribe.Utils.splitNode(endLineNode, endOffset, true), leftEnd = _ref1[0], rightEnd = _ref1[1];
      fragment = startLineNode.ownerDocument.createDocumentFragment();
      while (rightStart !== rightEnd) {
        next = rightStart.nextSibling;
        fragment.appendChild(rightStart);
        rightStart = next;
      }
      Scribe.Utils.moveExternal(fragment, leftStart, null);
      Scribe.Utils.mergeNodes(leftStart, rightEnd);
      return fragment;
    },
    findAncestor: function(node, checkFn) {
      while ((node != null) && !checkFn(node)) {
        node = node.parentNode;
      }
      return node;
    },
    getFormatDefault: function(name) {
      return Scribe.Constants.DEFAULT_LEAF_FORMATS[name] || false;
    },
    getFormatForContainer: function(container) {
      var format, indent;
      switch (container.tagName) {
        case 'A':
          return ['link', container.getAttribute('href')];
        case 'B':
          return ['bold', true];
        case 'I':
          return ['italic', true];
        case 'S':
          return ['strike', true];
        case 'U':
          return ['underline', true];
        case 'OL':
          return ['list', Scribe.Utils.getIndent(container)];
        case 'UL':
          return ['bullet', Scribe.Utils.getIndent(container)];
        case 'DIV':
          indent = Scribe.Utils.getIndent(container);
          if (indent > 0) {
            return ['indent', indent];
          } else {
            return [];
          }
        case 'SPAN':
          format = [];
          _.any(container.classList, function(css) {
            var key, parts, value;
            parts = css.split('-');
            if (parts.length > 1) {
              key = parts[0];
              value = parts.slice(1).join('-');
              if (Scribe.Constants.SPAN_FORMATS[key] != null) {
                format = [key, value];
                return true;
              }
            }
            return false;
          });
          return format;
        default:
          return [];
      }
    },
    getChildAtOffset: function(node, offset) {
      var child, length;
      child = node.firstChild;
      length = Scribe.Utils.getNodeLength(child);
      while (child != null) {
        if (offset < length) {
          break;
        }
        offset -= length;
        child = child.nextSibling;
        length = Scribe.Utils.getNodeLength(child);
      }
      if (child == null) {
        child = node.lastChild;
        offset = Scribe.Utils.getNodeLength(child);
      }
      return [child, offset];
    },
    getIndent: function(list) {
      var indent;
      indent = 0;
      _.any(list.classList, function(css) {
        if (css.substring(0, Scribe.Document.INDENT_PREFIX.length) === Scribe.Document.INDENT_PREFIX) {
          indent = parseInt(css.substring(Scribe.Document.INDENT_PREFIX.length));
          return true;
        }
        return false;
      });
      return indent;
    },
    getNodeLength: function(node) {
      var externalNodes, length;
      if (node == null) {
        return 0;
      }
      if (node.nodeType === node.ELEMENT_NODE) {
        if (node.classList.contains(Scribe.Constants.SPECIAL_CLASSES.EXTERNAL)) {
          return 0;
        }
        externalNodes = node.querySelectorAll("." + Scribe.Constants.SPECIAL_CLASSES.EXTERNAL);
        length = _.reduce(externalNodes, function(length, node) {
          return length - node.textContent.length;
        }, node.textContent.length);
        return length + (Scribe.Line.isLineNode(node) ? 1 : 0);
      } else if (node.nodeType === node.TEXT_NODE) {
        return node.textContent.length;
      } else {
        return 0;
      }
    },
    groupBlocks: function(root) {
      var cur, lastNewBlock, next, _results;
      cur = root.firstChild;
      lastNewBlock = null;
      _results = [];
      while (cur != null) {
        next = cur.nextSibling;
        if (Scribe.Utils.isBlock(cur)) {
          if (lastNewBlock != null) {
            lastNewBlock = null;
          }
        } else {
          if (lastNewBlock == null) {
            lastNewBlock = root.ownerDocument.createElement('div');
            cur.parentNode.insertBefore(lastNewBlock, cur);
          }
          lastNewBlock.appendChild(cur);
        }
        _results.push(cur = next);
      }
      return _results;
    },
    isBlock: function(node) {
      return _.indexOf(Scribe.Constants.BLOCK_TAGS, node.tagName) > -1;
    },
    isTextNodeParent: function(node) {
      return node.childNodes.length === 1 && node.firstChild.nodeType === node.TEXT_NODE;
    },
    insertExternal: function(position, extNode) {
      if (position.leafNode.lastChild != null) {
        if (position.leafNode.lastChild.nodeType === position.leafNode.TEXT_NODE) {
          position.leafNode.lastChild.splitText(position.offset);
          return position.leafNode.insertBefore(extNode, position.leafNode.lastChild);
        } else {
          return position.leafNode.parentNode.insertBefore(extNode, position.leafNode);
        }
      } else {
        if (position.offset !== 0) {
          console.warn('offset is not 0', position.offset);
        }
        return position.leafNode.parentNode.insertBefore(extNode, position.leafNode);
      }
    },
    mergeNodes: function(node1, node2) {
      if (!(node1 != null)) {
        return node2;
      }
      if (!(node2 != null)) {
        return node1;
      }
      this.moveChildren(node1, node2);
      node2.parentNode.removeChild(node2);
      if ((node1.tagName === 'OL' || node1.tagName === 'UL') && node1.childNodes.length === 2) {
        ScribeUtils.mergeNodes(node1.firstChild, node1.lastChild);
      }
      return node1;
    },
    moveChildren: function(newParent, oldParent) {
      return _.each(_.clone(oldParent.childNodes), function(child) {
        return newParent.appendChild(child);
      });
    },
    moveExternal: function(source, destParent, destRef) {
      var externalNodes;
      externalNodes = _.clone(source.querySelectorAll("." + Scribe.Constants.SPECIAL_CLASSES.EXTERNAL));
      return _.each(externalNodes, function(node) {
        return destParent.insertBefore(node, destRef);
      });
    },
    removeFormatFromSubtree: function(subtree, format) {
      var children, formats, name, ret, value, _ref;
      children = _.clone(subtree.childNodes);
      formats = Scribe.Utils.getFormatForContainer(subtree);
      _ref = Scribe.Utils.getFormatForContainer(subtree), name = _ref[0], value = _ref[1];
      ret = subtree;
      if (name === format) {
        ret = Scribe.Utils.unwrap(subtree);
      }
      _.each(children, function(child) {
        return Scribe.Utils.removeFormatFromSubtree(child, format);
      });
      return ret;
    },
    removeExternal: function(root) {
      var extNodes;
      extNodes = _.clone(root.querySelectorAll("." + Scribe.Constants.SPECIAL_CLASSES.EXTERNAL));
      return _.each(extNodes, function(node) {
        if (node.parentNode != null) {
          return node.parentNode.removeChild(node);
        }
      });
    },
    removeNode: function(node) {
      var next, prev;
      if (node.parentNode == null) {
        return;
      }
      if (Scribe.Line.isLineNode(node)) {
        prev = node.previousSibling;
        next = node.nextSibling;
        while (true) {
          if (Scribe.Line.isLineNode(prev)) {
            Scribe.Utils.moveExternal(node, prev, null);
            break;
          } else if (Scribe.Line.isLineNode(next)) {
            Scribe.Utils.moveExternal(node, next, next.firstChild);
            break;
          } else if (!(prev != null) && !(next != null)) {
            console.warn('External nodes might have no where to go!');
            Scribe.Utils.moveExternal(node, node.parentNode, node.nextSibling);
          } else {
            if (prev != null) {
              prev = prev.previousSibling;
            }
            if (next != null) {
              next = next.nextSibling;
            }
          }
        }
      } else {
        Scribe.Utils.moveExternal(node, node.parentNode, node.nextSibling);
      }
      return node.parentNode.removeChild(node);
    },
    removeStyles: function(root) {
      var walker, _results;
      walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
      walker.firstChild();
      walker.currentNode.removeAttribute('style');
      _results = [];
      while (walker.nextNode()) {
        _results.push(walker.currentNode.removeAttribute('style'));
      }
      return _results;
    },
    setIndent: function(list, indent) {
      _.each(_.clone(list.classList), function(css) {
        if (css.substring(0, Scribe.Document.INDENT_PREFIX.length) === Scribe.Document.INDENT_PREFIX) {
          return list.classList.remove(css);
        }
      });
      if (indent) {
        return list.classList.add(Scribe.Document.INDENT_PREFIX + indent);
      }
    },
    splitNode: function(node, offset, force) {
      var afterText, beforeText, child, childLeft, childRight, left, nextRight, right, _ref, _ref1;
      if (force == null) {
        force = false;
      }
      if (offset > Scribe.Utils.getNodeLength(node)) {
        throw new Error('Splitting at offset greater than node length');
      }
      if (node.nodeType === node.TEXT_NODE) {
        node = this.wrap(node.ownerDocument.createElement('span'), node);
      }
      if (!force) {
        if (offset === 0) {
          return [node.previousSibling, node, false];
        }
        if (offset === Scribe.Utils.getNodeLength(node)) {
          return [node, node.nextSibling, false];
        }
      }
      left = node;
      right = node.cloneNode(false);
      node.parentNode.insertBefore(right, left.nextSibling);
      if (ScribeUtils.isTextNodeParent(node)) {
        beforeText = node.textContent.substring(0, offset);
        afterText = node.textContent.substring(offset);
        left.textContent = beforeText;
        right.textContent = afterText;
        return [left, right, true];
      } else {
        _ref = ScribeUtils.getChildAtOffset(node, offset), child = _ref[0], offset = _ref[1];
        _ref1 = ScribeUtils.splitNode(child, offset), childLeft = _ref1[0], childRight = _ref1[1];
        while (childRight !== null) {
          nextRight = childRight.nextSibling;
          right.appendChild(childRight);
          childRight = nextRight;
        }
        return [left, right, true];
      }
    },
    switchTag: function(node, newTag) {
      var newNode;
      if (node.tagName === newTag) {
        return;
      }
      newNode = node.ownerDocument.createElement(newTag);
      this.moveChildren(newNode, node);
      node.parentNode.replaceChild(newNode, node);
      if (node.className) {
        newNode.className = node.className;
      }
      if (node.id) {
        newNode.id = node.id;
      }
      return newNode;
    },
    traversePreorder: function() {
      var args, context, cur, curHtml, fn, nextOffset, offset, root, _results;
      root = arguments[0], offset = arguments[1], fn = arguments[2], context = arguments[3], args = 5 <= arguments.length ? __slice.call(arguments, 4) : [];
      if (context == null) {
        context = fn;
      }
      if (root == null) {
        return;
      }
      cur = root.firstChild;
      _results = [];
      while (cur != null) {
        nextOffset = offset + Scribe.Utils.getNodeLength(cur);
        curHtml = cur.innerHTML;
        cur = fn.apply(context, [cur, offset].concat(args));
        ScribeUtils.traversePreorder.apply(ScribeUtils.traversePreorder, [cur, offset, fn, context].concat(args));
        if ((cur != null) && cur.innerHTML === curHtml) {
          cur = cur.nextSibling;
          _results.push(offset = nextOffset);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    traverseSiblings: function(startNode, endNode, fn) {
      var nextSibling, _results;
      _results = [];
      while (startNode != null) {
        nextSibling = startNode.nextSibling;
        fn(startNode);
        if (startNode === endNode) {
          break;
        }
        _results.push(startNode = nextSibling);
      }
      return _results;
    },
    unwrap: function(node) {
      var next;
      next = node.firstChild;
      _.each(_.clone(node.childNodes), function(child) {
        return node.parentNode.insertBefore(child, node);
      });
      node.parentNode.removeChild(node);
      return next;
    },
    wrap: function(wrapper, node) {
      node.parentNode.insertBefore(wrapper, node);
      wrapper.appendChild(node);
      return wrapper;
    },
    wrapChildren: function(wrapper, node) {
      Scribe.Utils.moveChildren(wrapper, node);
      node.appendChild(wrapper);
      return wrapper;
    }
  };

  window.Scribe || (window.Scribe = {});

  window.Scribe.Utils = ScribeUtils;

}).call(this);
