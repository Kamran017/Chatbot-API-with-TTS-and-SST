 try {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
  }
  catch(e) {
    console.error(e);
    $('.no-browser-support').show();
    $('.app').hide();
  }
  
  
  var noteTextarea = $('#note-textarea');
  var instructions = $('#recording-instructions');
  var notesList = $('ul#notes');

  var noteContent = '';
  var botToken= '';
  var botUrl= '';
  // Get all notes from previous sessions and display them.
  var notes = getAllNotes();
  renderNotes(notes);
  
  $("#approve").on("click", function(){
    botToken= $('#botToken').val();
    botUrl= $('#botUrl').val();
    alert(botUrl)
  })

  
  /*-----------------------------
        Voice Recognition 
  ------------------------------*/
  
  // If false, the recording will stop after a few seconds of silence.
  // When true, the silence period is longer (about 15 seconds),
  // allowing us to keep recording even when the user pauses. 
  // select language for voice recognition from dropdown menu
  $('#approveLang').on('click', function(e) {
    var lng=$("#langs :selected").val();
    // control language codes from dropdown menu
    if(lng =="germany"){
      recognition.lang="de-DE";
    } 
    else if(lng =="spanish"){
        recognition.lang='es-Es';
    } 
    else if(lng=="english"){
        recognition.lang="en-US";
    } 
    else if(lng =="turkish"){
      recognition.lang="tr-TR";
    } 
    recognition.continuous = true;
  });

  // This block is called every time the Speech APi captures a line. 
  recognition.onresult = function(event) {
  
    // event is a SpeechRecognitionEvent object.
    // It holds all the lines we have captured so far. 
    // We only need the current one.
    var current = event.resultIndex;
  
    // Get a transcript of what was said.
    var transcript = event.results[current][0].transcript;
  
    
  
    // Add the current transcript to the contents of our Note.
    // There is a weird bug on mobile, where everything is repeated twice.
    // There is no official solution so far so we have to handle an edge case.
    var mobileRepeatBug = (current == 1 && transcript == event.results[0][0].transcript);
  
    if(!mobileRepeatBug) {
      noteContent += transcript;
      noteTextarea.val(noteContent);
      recognition.stop() // stop recording after getting user voice
    }


    

  };

  recognition.onstart = function() { 
    instructions.text('Ses kaydı başladı. Lütfen mikrofona doğru konuşun.');
  }
  
  //send request to nodejs 
  
  let url="https://devadmin.cbot.ai:8443/sendRequest"

  recognition.onspeechend=function(){
    console.log(noteContent)
    // get bot parameters from text box
    botToken= $('#botToken').val();
    botUrl= $('#botUrl').val();

    var posting = $.post( url, { text: noteContent , url:botUrl, token:botToken}, function(data){
      console.log(data)
      saveNote(new Date().toLocaleString(), data);
      lng=$("#langs :selected").val(); // The value of the selected option
      console.log(lng)
      new Audio("https://devadmin.cbot.ai:8443/speech?text="+data+"&lang="+lng).play()
    });
    
  }
  
  recognition.onerror = function(event) {
    if(event.error == 'no-speech') {
      instructions.text('Ses algılanamadı. Lütfen tekrar deneyin.');  
    };
  }
  
  
  
  /*-----------------------------
        App buttons and input 
  ------------------------------*/
  
  $('#start-record-btn').on('click', function(e) {
    noteContent = '';
    if (noteContent.length) {
      noteContent += ' ';
    }
    recognition.start();
  });
  
  
  // $('#pause-record-btn').on('click', function(e) {
  //   recognition.stop();
  //   instructions.text('Voice recognition paused.');
  // });
  
  // Sync the text inside the text area with the noteContent variable.
  noteTextarea.on('input', function() {
    noteContent = $(this).val();
  })
  
  $('#sendToBot').on('click', async function(e) {
    recognition.stop();
  
    if(!noteContent.length) {
      instructions.text('Boş ses kaydı gönderilemez. Lütfen yazarak ve ya konuşarak bota istek gönderin.');
    }
    else {
      try {
        const resp = await sendRequest(botUrl, botToken,noteContent)
        botResp= mrkdwn(resp.message[0].message); 
        // console.log(botResp.text)
        // Save note to localStorage.
        // The key is the dateTime with seconds, the value is the content of the note.
        saveNote(new Date().toLocaleString(), botResp.text);
    
        // Reset variables and update UI.
        noteContent = '';
        renderNotes(getAllNotes());
        noteTextarea.val('');
        instructions.text('Note saved successfully.');
  
      } catch (error) {
          console.log(error)
      }
    }
  })
  
  
  notesList.on('click', function(e) {
    e.preventDefault();
    var target = $(e.target);
  
    // // Listen to the selected note.
    // if(target.hasClass('listen-note')) {
    //   var content = target.closest('.note').find('.content').text();
    //   readOutLoud(content);
    // }
  
    // Delete note.
    if(target.hasClass('delete-note')) {
      var dateTime = target.siblings('.date').text();  
      deleteNote(dateTime);
      target.closest('.note').remove();
    }
  });
  
 
  
  /*-----------------------------
        Helper Functions 
  ------------------------------*/
  
  function renderNotes(notes) {
    var html = '';
    if(notes.length) {
      notes.forEach(function(note) {
        html+= `<li class="note" style="list-style-type:none;">
          <p class="header">
            <span class="date">${note.date}</span>
            <a href="#" class="delete-note" title="Delete">Cevabı Sil</a>
          </p>
          <p class="content">${note.content}</p>
        </li>`;    
      });
    }
    else {
      html = '<li><p class="content">Herhangi bir kayıt bulunamamaktadır.</p></li>';
    }
    notesList.html(html);
  }
  
  
  function saveNote(dateTime, content) {
    localStorage.setItem('note-' + dateTime, content);
  }
  
  
  function getAllNotes() {
    var notes = [];
    var key;
    for (var i = 0; i < localStorage.length; i++) {
      key = localStorage.key(i);
      console.log(i)
      console.log(key)
  
      if(key.substring(0,5) == 'note-') {
        notes.push({
          date: key.replace('note-',''),
          content: localStorage.getItem(localStorage.key(i))
        });
      } 
    }
    console.log(notes)
    return notes;
  }
  
  
  function deleteNote(dateTime) {
    localStorage.removeItem('note-' + dateTime); 
  }
