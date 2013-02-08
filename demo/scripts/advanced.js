var tandem = new Tandem.Client('http://localhost:8080');
var file = tandem.open('1234');
var editor = new Scribe.Editor('editor');

file.on(Tandem.File.events.UPDATE, function(delta) {
  editor.applyDelta(delta);
});
editor.on(Scribe.Editor.events.TEXT_CHANGE, function(delta) {
  file.update(delta);
});
