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
  
}


$(document).ready(function () {
  var tandem = new Tandem.Client('http://localhost:8080');
  var file = tandem.open('1337');
  file.on('file-update', function(delta) {
    delta.apply(insertAt, deleteAt)
  });

  text = ''
  $('#editor').keydown(function() {
    text = $(this).val() 
  }).keyup(function() {
    delta = diffToDelta(text, $(this).val())
    file.update(delta)
  });
})
