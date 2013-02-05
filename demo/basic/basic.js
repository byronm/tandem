insertAt = function(index, text) {
  var curText = $('#editor').val();
  var newText = curText.slice(0, index) + text + curText.slice(index);
  $('#editor').val(newText);
}

deleteAt = function(index, length) {
  var curText = $('#editor').val();
  var newText = curText.slice(0, index) + curText.slice(index + length);
  $('#editor').val(newText);
}

textToDelta = function(oldText, newText) {
  oldDelta = Tandem.Delta.getInitial(oldText);
  newDelta = Tandem.Delta.getInitial(newText);
  return newDelta.decompose(oldDelta);
}


$(document).ready(function () {
  var tandem = new Tandem.Client('http://localhost:8080');
  var file = tandem.open('1337');
  var text = '';

  file.on('file-update', function(delta) {
    delta.apply(insertAt, deleteAt);
    text = $('#editor').val();
  });

  // Use input instead of key listeners to avoid race condition complexities 
  $('#editor').bind('input', function() {
    var newText = $(this).val();
    var delta = textToDelta(text, newText);
    text = newText;
    file.update(delta);
  });
})
