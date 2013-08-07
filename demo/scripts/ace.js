AceRange = ace.require("ace/range").Range


var convertAceDelta = function(aceDelta) {
  var ops = [];
  var startIndex = positionToIndex.call(this, aceDelta.range.start);
  var docText = this.getAllLines().join("\n");
  var startLength = docText.length;
  var endLength = docText.length;
  var text;
  if (aceDelta.action == 'insertText' || aceDelta.action == 'removeText') {
    text = aceDelta.text;
  } else {
    text = aceDelta.lines.join("\n") + "\n"
  }
  text = text.replace(/\r\n/, '\n');

  ops.push(new Tandem.RetainOp(0, startIndex));
  if (aceDelta.action == 'insertLines' || aceDelta.action == 'insertText') {
    startLength -= text.length
    ops.push(new Tandem.InsertOp(text))
    ops.push(new Tandem.RetainOp(startIndex, docText.length - text.length))
  } else if (aceDelta.action == 'removeLines' || aceDelta.action == 'removeText') {
    endIndex = startIndex + text.length
    startLength += text.length
    ops.push(new Tandem.RetainOp(endIndex, docText.length + text.length)) 
  } else {
    console.assert(false, "Ace delta has no valid change action", aceDelta)
  }
  return new Tandem.Delta(startLength, endLength, ops)
};

var deleteAt = function(index, length) {
  var startPos = indexToPosition.call(this, index);
  var endPos = indexToPosition.call(this, index + length);
  var range = new AceRange(startPos.row, startPos.column, endPos.row, endPos.column);
  this.remove(range);
};

var formatAt = function() {};

var indexToPosition = function(index) {
  var row = 0;
  var column = index;
  for (var i = 0; i < this.$lines.length; i++) {
    var line = this.$lines[i];
    if (index <= line.length) {
      return { row: row, column: index };
    } else {
      index -= (line.length + 1); // +1 due to newline
      row += 1;
      column = line.length;
    }
  }
  // -1 col since we added +1 for newline when we were on the last line
  if (lines.length > 1) {
    column -= 1;
  }
  // -1 row since we incremented row when we were on the last row
  return { row: row - 1, column: column };
};

var insertAt = function(index, text) {
  var pos = indexToPosition.call(this, index);
  this.insert(pos, text);
}

var positionToIndex = function(position) {
  var lines = this.$lines;
  var index = 0;
  var curRow = 0;
  while (curRow < position.row) {
    index += lines[curRow].length + 1       // +1 to account for the newline
    curRow += 1;
  }
  return index + position.column;
};


var editor = ace.edit("editor");
var session = editor.getSession();
var enabled = true;
editor.setTheme("ace/theme/monokai");
session.setMode("ace/mode/javascript");
session.doc.setNewLineMode("unix");

var tandem = new Tandem.Client('http://localhost:8000');
var file = tandem.open('42');
file.on('file-update', function(delta) {
  enabled = false;
  delta.apply(insertAt, deleteAt, formatAt, session.doc);
  enabled = true;
});

session.doc.on('change', function(change) {
  if (enabled) {
    delta = convertAceDelta.call(session.doc, change.data)
    file.update(delta)
  }
});
