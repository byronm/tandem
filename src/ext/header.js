(function() {
  var _ = window._.noConflict();
  var async = window.async.noConflict();
  var EventEmitter2 = window.EventEmitter2;
  var LinkedList = window.LinkedList;
  window.async = window.LinkedList = window.EventEmitter2 = undefined;
  