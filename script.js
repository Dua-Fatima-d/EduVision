
"use strict";

const $ = id => document.getElementById(id);
const getStore = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const setStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));

let notes = getStore("ev_notes", []);
let tasks = getStore("ev_tasks", []);
let history = getStore("ev_history", []);
let posts = getStore("ev_posts", []);
let xp = getStore("ev_xp", 0);
let profile = getStore("ev_profile", {name:"Student", studentClass:"", board:"Punjab Board"});
let quizIndex = 0, quizScore = 0, quizAnswered = false;
let examIndex = 0, examScore = 0, examAnswers = [], examInterval = null, examSeconds = 300;
let timerSeconds = 1500, timerInterval = null, generatedText = "";
let pdfUrl = null, imageUrl = null;

const quizQuestions = [
  {subject:"Physics",topic:"Motion",q:"What is the SI unit of force?",a:["Joule","Newton","Watt","Pascal"],correct:1},
  {subject:"Biology",topic:"Cells",q:"Which organelle is called the powerhouse of the cell?",a:["Nucleus","Ribosome","Mitochondrion","Vacuole"],correct:2},
  {subject:"Mathematics",topic:"Algebra",q:"What is the value of 5 × 6?",a:["11","25","30","56"],correct:2},
  {subject:"Chemistry",topic:"Atoms",q:"What is the chemical symbol for oxygen?",a:["Ox","O","Og","Oy"],correct:1},
  {subject:"Computer",topic:"Computing",q:"What does CPU stand for?",a:["Central Processing Unit","Computer Personal Unit","Central Program Utility","Control Power Unit"],correct:0}
];

const examQuestions = [
  {q:"Which planet is known as the Red Planet?",a:["Earth","Mars","Venus","Jupiter"],c:1},
  {q:"What is 12 × 8?",a:["86","92","96","108"],c:2},
  {q:"Which gas do plants absorb?",a:["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"],c:2},
  {q:"What is the SI unit of electric current?",a:["Volt","Ampere","Ohm","Watt"],c:1},
  {q:"Which part of a computer displays output?",a:["Keyboard","Mouse","Monitor","Scanner"],c:2}
];

function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
}
function addXP(amount) {
  xp += amount;
  setStore("ev_xp", xp);
  updateDashboard();
}
function updateDashboard() {
  $("xpStat").textContent = xp + " XP";
  $("notesStat").textContent = notes.length;
  $("quizStat").textContent = history.length;
  $("streakStat").textContent = "1 day";
  const level = Math.floor(xp / 100) + 1;
  $("levelText").textContent = "Level " + level;
  $("xpProgress").style.width = (xp % 100) + "%";
  $("xpMessage").textContent = `${xp % 100}/100 XP to the next level. Keep learning!`;
  $("sideName").textContent = profile.name || "Student";
  $("sideClass").textContent = profile.studentClass || "Choose your class";
  $("studentName").value = profile.name || "";
  $("studentClass").value = profile.studentClass || "";
  $("studentBoard").value = profile.board || "Punjab Board";
  renderLeaderboard();
  renderWeakness();
}
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === pageId));
  document.querySelectorAll(".nav-link[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === pageId));
  const active = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  $("pageHeading").textContent = active ? active.innerText.trim() : "Dashboard";
  $("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
  if (pageId === "weakness") renderWeakness();
  if (pageId === "leaderboard") renderLeaderboard();
}
document.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.go)));
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));

function toggleTheme() {
  document.body.classList.toggle("light");
  localStorage.setItem("ev_theme", document.body.classList.contains("light") ? "light" : "dark");
}
$("themeToggle").addEventListener("click", toggleTheme);
$("topTheme").addEventListener("click", toggleTheme);
if (localStorage.getItem("ev_theme") === "light") document.body.classList.add("light");

$("todayDate").textContent = new Intl.DateTimeFormat("en-PK",{day:"numeric",month:"short",year:"numeric"}).format(new Date());
$("saveProfile").addEventListener("click", () => {
  profile = {name:$("studentName").value.trim() || "Student",studentClass:$("studentClass").value,board:$("studentBoard").value};
  setStore("ev_profile",profile);
  updateDashboard();
  alert("Profile saved in this browser.");
});

// Notes manager
function renderNotes() {
  const search = $("noteSearch").value.toLowerCase();
  const filtered = notes.filter(n => (n.title+n.subject+n.content).toLowerCase().includes(search));
  $("notesList").innerHTML = filtered.length ? filtered.map(n => `
    <article class="note-card">
      <small>${escapeHTML(n.subject || "General")}</small>
      <h3>${escapeHTML(n.title)}</h3>
      <p>${escapeHTML(n.content.slice(0,260))}${n.content.length>260?"…":""}</p>
      <div class="note-actions">
        <button class="secondary-btn" data-edit="${n.id}">Edit</button>
        <button class="secondary-btn" data-delete="${n.id}">Delete</button>
      </div>
    </article>`).join("") : `<div class="panel">No notes found. Create your first note above.</div>`;
}
function clearNoteForm() {
  $("noteTitle").value=""; $("noteSubject").value=""; $("noteContent").value=""; $("editingNote").value="";
  $("saveNote").textContent="Save Note";
}
$("saveNote").addEventListener("click", () => {
  const title=$("noteTitle").value.trim(), content=$("noteContent").value.trim();
  if (!title || !content) return alert("Please enter a note title and content.");
  const id=$("editingNote").value;
  if (id) {
    notes=notes.map(n=>n.id===id?{...n,title,subject:$("noteSubject").value.trim(),content}:n);
  } else {
    notes.unshift({id:crypto.randomUUID(),title,subject:$("noteSubject").value.trim(),content});
    addXP(5);
  }
  setStore("ev_notes",notes); clearNoteForm(); renderNotes(); updateDashboard();
});
$("cancelNote").addEventListener("click",clearNoteForm);
$("noteSearch").addEventListener("input",renderNotes);
$("notesList").addEventListener("click",e=>{
  const edit=e.target.dataset.edit, del=e.target.dataset.delete;
  if(edit){
    const n=notes.find(x=>x.id===edit); if(!n)return;
    $("noteTitle").value=n.title; $("noteSubject").value=n.subject; $("noteContent").value=n.content;
    $("editingNote").value=n.id; $("saveNote").textContent="Update Note"; window.scrollTo({top:0,behavior:"smooth"});
  }
  if(del && confirm("Delete this note?")){
    notes=notes.filter(n=>n.id!==del);setStore("ev_notes",notes);renderNotes();updateDashboard();
  }
});

// Demo AI tutor: rule-based responses, not a live AI model.
function tutorReply(question) {
  const q=question.toLowerCase();
  if(q.includes("photosynthesis")) return "Photosynthesis is the process by which green plants make food using sunlight, water and carbon dioxide. It mainly takes place in the leaves. Oxygen is released during this process.\n\nRemember: Sunlight + Water + Carbon dioxide → Glucose + Oxygen.";
  if(q.includes("newton") || q.includes("force")) return "Force is a push or pull that can change an object's motion. Its SI unit is the Newton (N).\n\nNewton's second law: Force = mass × acceleration (F = ma).";
  if(q.includes("algebra") || q.includes("equation")) return "Algebra uses letters or symbols to represent unknown numbers. For example, x + 3 = 7. Subtract 3 from both sides, so x = 4.";
  if(q.includes("atom")) return "An atom is a basic unit of an element. It contains protons and neutrons in the nucleus, with electrons around the nucleus.";
  if(q.includes("computer") || q.includes("cpu")) return "A computer is an electronic device that processes data. CPU stands for Central Processing Unit; it executes instructions and coordinates many computer operations.";
  return "Let's break this topic into smaller steps:\n\n1. Identify the main idea in your question.\n2. Write down important terms and definitions.\n3. Connect the idea with an example.\n4. Practise one question to check your understanding.\n\nThis is a limited demo response. A real AI tutor will need an AI service connected through a secure backend.";
}
function addChat(text,type) {
  const div=document.createElement("div");
  div.className="chat-bubble "+type; div.textContent=text;
  $("tutorChat").appendChild(div); $("tutorChat").scrollTop=$("tutorChat").scrollHeight;
}
$("tutorForm").addEventListener("submit",e=>{
  e.preventDefault(); const q=$("tutorQuestion").value.trim(); if(!q)return;
  addChat(q,"user"); $("tutorQuestion").value="";
  addChat(tutorReply(q),"bot");
});
$("clearTutor").addEventListener("click",()=>{$("tutorChat").innerHTML='<div class="chat-bubble bot">Hello! Ask me a study question.</div>';});

// Notes generator demo
function buildStudySheet(topic,subject,language) {
  if(language==="Urdu") return `موضوع: ${topic}\nمضمون: ${subject}\n\nتعارف:\n${topic}، ${subject} کا ایک اہم موضوع ہے۔ اسے سمجھنے کے لیے بنیادی تعریف اور اہم نکات پر توجہ دیں۔\n\nاہم نکات:\n1. موضوع کی تعریف لکھیں۔\n2. اس کے بنیادی اصول سمجھیں۔\n3. متعلقہ مثالیں یاد کریں۔\n4. اپنی کتاب سے مشق کے سوالات حل کریں۔\n\nیاد رکھنے کی بات:\nامتحان کی تیاری کے لیے اپنی درسی کتاب اور استاد کے نوٹس سے تصدیق ضرور کریں۔`;
  return `STUDY NOTES: ${topic}\nSubject: ${subject}\n\n1. INTRODUCTION\n${topic} is an important topic in ${subject}. Begin by understanding its main definition and purpose.\n\n2. KEY POINTS\n• Learn the main definition.\n• Identify important terms and concepts.\n• Study examples from your textbook.\n• Practise short and long questions.\n\n3. QUICK REVISION\nWrite a two-sentence summary in your own words and revise it regularly.\n\n4. PRACTICE\nCreate three short questions and one detailed question about ${topic}.\n\nNote: This is a generated study template. Verify subject facts using your prescribed textbook.`;
}
$("generateNotes").addEventListener("click",()=>{
  const topic=$("genTopic").value.trim(), subject=$("genSubject").value.trim() || "General";
  if(!topic)return alert("Enter a topic first.");
  generatedText=buildStudySheet(topic,subject,$("genLanguage").value);
  $("generatedOutput").textContent=generatedText;
  $("generatedOutput").classList.remove("hidden"); $("saveGenerated").classList.remove("hidden");
});
$("saveGenerated").addEventListener("click",()=>{
  notes.unshift({id:crypto.randomUUID(),title:$("genTopic").value.trim()+" - Study Sheet",subject:$("genSubject").value.trim(),content:generatedText});
  setStore("ev_notes",notes);renderNotes();updateDashboard();addXP(5);
  alert("Study sheet saved to My Notes.");
});

// Quiz engine
function renderQuiz() {
  const q=quizQuestions[quizIndex]; quizAnswered=false;
  $("quizCounter").textContent=`Question ${quizIndex+1} of ${quizQuestions.length}`;
  $("quizResult").classList.add("hidden");
  $("quizArea").innerHTML=`<small>${q.subject} · ${q.topic}</small><h3>${q.q}</h3>`+
    q.a.map((a,i)=>`<button class="answer-option" data-answer="${i}">${String.fromCharCode(65+i)}. ${a}</button>`).join("");
}
$("quizArea").addEventListener("click",e=>{
  const btn=e.target.closest("[data-answer]"); if(!btn||quizAnswered)return;
  quizAnswered=true; const selected=Number(btn.dataset.answer), q=quizQuestions[quizIndex];
  document.querySelectorAll("#quizArea .answer-option").forEach((b,i)=>{
    if(i===q.correct)b.classList.add("correct");
    if(i===selected && i!==q.correct)b.classList.add("wrong");
  });
  if(selected===q.correct)quizScore++;
  $("quizResult").classList.remove("hidden");
  $("quizResult").textContent=selected===q.correct?"Correct! Well done.":"Not quite. Review the correct answer highlighted above.";
});
$("nextQuestion").addEventListener("click",()=>{
  if(!quizAnswered)return alert("Choose an answer first.");
  if(quizIndex<quizQuestions.length-1){quizIndex++;renderQuiz();}
  else{
    const percent=Math.round(quizScore/quizQuestions.length*100);
    history.unshift({type:"Quick Quiz",score:quizScore,total:quizQuestions.length,percent,date:new Date().toISOString(),topic:"Mixed subjects"});
    setStore("ev_history",history);addXP(quizScore*10+5);
    $("quizArea").innerHTML=`<h3>Quiz completed!</h3><p>You scored ${quizScore} out of ${quizQuestions.length} (${percent}%).</p>`;
    $("quizResult").classList.remove("hidden");$("quizResult").textContent="Your result has been saved.";
    $("quizCounter").textContent="Completed";updateDashboard();
  }
});
$("restartQuiz").addEventListener("click",()=>{quizIndex=0;quizScore=0;renderQuiz();});
renderQuiz();

// Timed examination
function renderExamQuestion(){
  const q=examQuestions[examIndex];
  $("examArea").innerHTML=`<small>Question ${examIndex+1} of ${examQuestions.length}</small><h3>${q.q}</h3>`+
    q.a.map((a,i)=>`<button class="answer-option ${examAnswers[examIndex]===i?"selected":""}" data-exam-answer="${i}">${String.fromCharCode(65+i)}. ${a}</button>`).join("")+
    `<div class="button-row"><button class="primary-btn" id="examNext">${examIndex===examQuestions.length-1?"Submit Exam":"Next Question →"}</button></div>`;
}
$("startExam").addEventListener("click",()=>{
  examIndex=0;examScore=0;examAnswers=[];examSeconds=300;
  $("examResult").classList.add("hidden");renderExamQuestion();updateExamTimer();
  clearInterval(examInterval);
  examInterval=setInterval(()=>{
    examSeconds--;updateExamTimer();
    if(examSeconds<=0)finishExam();
  },1000);
});
$("examArea").addEventListener("click",e=>{
  const option=e.target.closest("[data-exam-answer]");
  if(option){examAnswers[examIndex]=Number(option.dataset.examAnswer);renderExamQuestion();return;}
  if(e.target.id==="examNext"){
    if(examAnswers[examIndex]===undefined)return alert("Choose an answer first.");
    if(examIndex<examQuestions.length-1){examIndex++;renderExamQuestion();}
    else finishExam();
  }
});
function updateExamTimer(){
  $("examTimer").textContent=`${String(Math.floor(examSeconds/60)).padStart(2,"0")}:${String(examSeconds%60).padStart(2,"0")}`;
}
function finishExam(){
  clearInterval(examInterval);examScore=examQuestions.filter((q,i)=>examAnswers[i]===q.c).length;
  const percent=Math.round(examScore/examQuestions.length*100);
  history.unshift({type:"Timed Exam",score:examScore,total:examQuestions.length,percent,date:new Date().toISOString(),topic:"Mixed subjects"});
  setStore("ev_history",history);addXP(examScore*12+5);
  $("examArea").innerHTML="<p>Examination submitted.</p>";
  $("examResult").classList.remove("hidden");
  $("examResult").textContent=`Your result: ${examScore}/${examQuestions.length} (${percent}%).`;
  updateDashboard();
}

// Weakness report
function renderWeakness(){
  if(!history.length){$("weaknessReport").innerHTML="<p>Complete a quiz or exam to see your learning report.</p>";return;}
  const average=Math.round(history.reduce((s,h)=>s+h.percent,0)/history.length);
  const latest=history.slice(0,5);
  $("weaknessReport").innerHTML=`<h3>Recent performance</h3><p>Average score: <strong>${average}%</strong></p>`+
    latest.map(h=>`<div class="syllabus-item"><strong>${escapeHTML(h.type)}</strong><small>${h.score}/${h.total} correct · ${h.percent}% · ${new Date(h.date).toLocaleDateString()}</small></div>`).join("")+
    `<p class="muted">Study suggestion: revisit topics where you missed questions. Current demo questions are mixed-subject samples, so this report cannot diagnose every subject or chapter.</p>`;
}

// Syllabus sample library
const syllabusTopics={
  Physics:["Physical quantities and measurement","Motion and force","Work and energy","Properties of matter"],
  Mathematics:["Real numbers","Algebraic expressions","Linear equations","Geometry"],
  Chemistry:["Fundamentals of chemistry","Atomic structure","Periodic table","Chemical bonding"],
  Biology:["Introduction to biology","Cell structure","Biological molecules","Enzymes"],
  "Computer Science":["Computer fundamentals","Data representation","Problem solving","Programming basics"],
  English:["Reading comprehension","Grammar","Writing skills","Vocabulary"]
};
$("findSyllabus").addEventListener("click",()=>{
  const cls=$("syllabusClass").value, board=$("syllabusBoard").value, subject=$("syllabusSubject").value;
  $("syllabusResults").innerHTML=`<p class="muted">Sample topic list · ${escapeHTML(cls)} · ${escapeHTML(board)} · ${escapeHTML(subject)}</p>`+
    syllabusTopics[subject].map((t,i)=>`<div class="syllabus-item"><strong>${i+1}. ${escapeHTML(t)}</strong><small>Sample learning topic — check your current official textbook and board syllabus.</small></div>`).join("");
});

// Local smart classroom
function renderPosts(){
  $("classPosts").innerHTML=posts.length?posts.map(p=>`<div class="post-item"><strong>${escapeHTML(p.topic)}</strong><p>${escapeHTML(p.message)}</p><small>${new Date(p.date).toLocaleString()}</small></div>`).join(""):"<p class='muted'>No classroom announcements yet.</p>";
}
$("postAnnouncement").addEventListener("click",()=>{
  const topic=$("classTopic").value.trim(), message=$("classAnnouncement").value.trim();
  if(!topic||!message)return alert("Enter a topic and announcement.");
  posts.unshift({topic,message,date:new Date().toISOString()});setStore("ev_posts",posts);
  $("classTopic").value="";$("classAnnouncement").value="";renderPosts();
});

// PDF preview
$("pdfFile").addEventListener("change",e=>{
  const file=e.target.files[0];if(!file)return;
  if(file.type!=="application/pdf")return alert("Please choose a PDF file.");
  if(pdfUrl)URL.revokeObjectURL(pdfUrl);
  pdfUrl=URL.createObjectURL(file);
  $("pdfFrame").src=pdfUrl;$("pdfFrame").classList.remove("hidden");
  $("pdfInfo").textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
});

// Image upload preview and typed-question demo
$("questionImage").addEventListener("change",e=>{
  const file=e.target.files[0];if(!file)return;
  if(imageUrl)URL.revokeObjectURL(imageUrl);
  imageUrl=URL.createObjectURL(file);
  $("questionPreview").src=imageUrl;$("questionPreview").classList.remove("hidden");
});
$("solveImageQuestion").addEventListener("click",()=>{
  const q=$("imageQuestionText").value.trim();
  if(!q)return alert("Type the question shown in your image.");
  $("imageAnswer").textContent="Demo explanation:\n\n"+tutorReply(q)+"\n\nImage text is not automatically recognised in this version. Type the question above. OCR and real AI image understanding need additional services.";
  $("imageAnswer").classList.remove("hidden");
});

// Study planner
function renderTasks(){
  $("taskList").innerHTML=tasks.length?tasks.map(t=>`
    <div class="task-item ${t.done?"done":""}">
      <input type="checkbox" data-task="${t.id}" ${t.done?"checked":""} style="width:auto">
      <span>${escapeHTML(t.text)} ${t.date?`<small> · ${escapeHTML(t.date)}</small>`:""}</span>
      <button data-remove-task="${t.id}" aria-label="Delete task">✕</button>
    </div>`).join(""):"<p class='muted'>No tasks added yet.</p>";
}
$("addTask").addEventListener("click",()=>{
  const text=$("taskInput").value.trim();if(!text)return alert("Enter a task.");
  tasks.push({id:crypto.randomUUID(),text,date:$("taskDate").value,done:false});
  setStore("ev_tasks",tasks);$("taskInput").value="";renderTasks();addXP(2);
});
$("taskList").addEventListener("change",e=>{
  const id=e.target.dataset.task;if(!id)return;
  tasks=tasks.map(t=>t.id===id?{...t,done:e.target.checked}:t);
  setStore("ev_tasks",tasks);renderTasks();
  if(e.target.checked)addXP(3);
});
$("taskList").addEventListener("click",e=>{
  const id=e.target.dataset.removeTask;if(!id)return;
  tasks=tasks.filter(t=>t.id!==id);setStore("ev_tasks",tasks);renderTasks();
});

// Focus timer
function displayTimer(){
  $("timerDisplay").textContent=`${String(Math.floor(timerSeconds/60)).padStart(2,"0")}:${String(timerSeconds%60).padStart(2,"0")}`;
}
$("timerStart").addEventListener("click",()=>{
  if(timerInterval){clearInterval(timerInterval);timerInterval=null;$("timerStart").textContent="Resume";return;}
  $("timerStart").textContent="Pause";
  timerInterval=setInterval(()=>{
    timerSeconds--;displayTimer();
    if(timerSeconds<=0){
      clearInterval(timerInterval);timerInterval=null;$("timerStart").textContent="Start";
      addXP(10);alert("Focus session completed! You earned 10 XP.");
    }
  },1000);
});
$("timerReset").addEventListener("click",()=>{
  clearInterval(timerInterval);timerInterval=null;timerSeconds=1500;
  $("timerStart").textContent="Start";displayTimer();
});

// Voice reader and browser speech recognition
$("speakText").addEventListener("click",()=>{
  const text=$("voiceText").value.trim();if(!text)return alert("Enter text to read.");
  if(!("speechSynthesis" in window))return alert("Speech is not supported by this browser.");
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang="en-US";speechSynthesis.speak(utterance);
});
$("stopSpeak").addEventListener("click",()=>{if("speechSynthesis" in window)speechSynthesis.cancel();});
$("speechInput").addEventListener("click",()=>{
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){$("speechStatus").textContent="Speech input is not supported in this browser.";return;}
  const recognition=new Recognition();recognition.lang="en-US";
  $("speechStatus").textContent="Listening... Please speak.";
  recognition.onresult=e=>{$("voiceText").value+=($("voiceText").value?"\n":"")+e.results[0][0].transcript;$("speechStatus").textContent="Speech added to the text box.";};
  recognition.onerror=()=>{$("speechStatus").textContent="Speech input could not be completed.";};
  recognition.onend=()=>{if($("speechStatus").textContent==="Listening... Please speak.")$("speechStatus").textContent="Listening stopped.";};
  recognition.start();
});

// Demo leaderboard
function renderLeaderboard(){
  const entries=[
    {name:"Ayesha",points:280,example:true},
    {name:"Hamza",points:220,example:true},
    {name:"Sara",points:170,example:true},
    {name:profile.name||"You",points:xp,example:false}
  ].sort((a,b)=>b.points-a.points);
  $("leaderboardList").innerHTML=entries.map((p,i)=>`
    <div class="leader-row"><span class="rank">${["🥇","🥈","🥉","🏅"][i]}</span>
    <strong>${escapeHTML(p.name)} ${p.example?"": "(You)"}</strong>
    <small>${p.points} XP ${p.example?"· Demo":""}</small></div>`).join("")+
    `<p class="muted">Example scores are fictional and stored only for this demonstration. This is not a live multi-student leaderboard.</p>`;
}

// Printable certificate
$("makeCertificate").addEventListener("click",()=>{
  const name=$("certificateName").value.trim()||profile.name||"Student";
  const achievement=$("certificateAchievement").value;
  $("certificatePreview").innerHTML=`<p>EDUVISION · SMART LEARNING SYSTEM</p><h2>Certificate of Achievement</h2><p>This certificate is proudly presented to</p><h3>${escapeHTML(name)}</h3><p>In recognition of completing the learning milestone</p><h3>${escapeHTML(achievement)}</h3><p>Date: ${new Date().toLocaleDateString()}</p><p>Keep learning. Keep growing.</p>`;
  $("certificatePreview").classList.remove("hidden");$("printCertificate").classList.remove("hidden");
});
$("printCertificate").addEventListener("click",()=>window.print());

// Initial page setup
renderNotes();
renderTasks();
renderPosts();
updateDashboard();
displayTimer();

// Register offline cache after opening through localhost or HTTPS.
if("serviceWorker" in navigator && location.protocol!=="file:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
