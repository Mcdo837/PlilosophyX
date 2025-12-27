/* Improved quotes logic: fixed random selection, persistent likes/dislikes (localStorage), and cross-tab sync */
const container = document.querySelector('.quotes-container');
const likesContainer = document.querySelector('.like-dislike-container');
const likeBtn = document.querySelector('.like-button');
const dislikeBtn = document.querySelector('.dislike-button');

let currentIndex = 0;
let reactions = {}; // stores likes/dislikes per quote index

// initialize UI placeholder
if(container.innerHTML.trim() === ''){
  container.innerHTML = `<h3>Loading...</h3>`;
}

function initReactions(){
  const raw = localStorage.getItem('quotes_reactions');
  if(raw){
    try{ reactions = JSON.parse(raw); } catch(e){ reactions = {}; }
  }
  // ensure every quote has an entry (use initial values from qoutes-data if provided)
  quotes.forEach((q, i) => {
    if(!reactions[i]){
      reactions[i] = {
        likes: typeof q.likes === 'number' ? q.likes : 0,
        dislikes: typeof q.dislikes === 'number' ? q.dislikes : 0
      };
    }
  });
  saveReactions();
}

function saveReactions(){
  localStorage.setItem('quotes_reactions', JSON.stringify(reactions));
}

// Cross-tab sync: BroadcastChannel (if available) and storage event listener
const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('quotes_channel') : null;
if(bc){
  bc.onmessage = (e) => {
    if(e.data && e.data.type === 'reactions_updated'){
      reactions = e.data.payload;
      showQuote(currentIndex);
    }
  };
}

window.addEventListener('storage', (e) => {
  if(e.key === 'quotes_reactions' && e.newValue){
    try{
      reactions = JSON.parse(e.newValue);
      showQuote(currentIndex);
    }catch(err){ /* ignore parse errors */ }
  }
});

function pickRandomIndex(){
  return Math.floor(Math.random() * quotes.length);
}

function showQuote(index){
  currentIndex = index;
  const q = quotes[index];
  if(!q) return;
  container.innerHTML = `<h1 class="quote">"${q.word}"</h1> <br> <p class="author">— ${q.author}</p>`;
  const r = reactions[index] || {likes:0, dislikes:0};
  likesContainer.innerHTML = `<p>Likes: <span class="likes-count">${r.likes}</span></p> <p>Dislikes: <span class="dislikes-count">${r.dislikes}</span></p>`;
}

function nextQuote(){
  const idx = pickRandomIndex();
  showQuote(idx);
}

function updateAfterReaction(){
  saveReactions();
  if(bc) bc.postMessage({ type: 'reactions_updated', payload: reactions });
  // writing a separate key can help trigger storage listeners reliably
  localStorage.setItem('quotes_reactions_last_update', Date.now().toString());
  showQuote(currentIndex);
  // TODO: send update to remote server here when backend is available
}

// public API (keeps inline HTML onclick handlers working and also used by event listeners)
function like(){
  reactions[currentIndex].likes++;
  updateAfterReaction();
}

function dislike(){
  reactions[currentIndex].dislikes++;
  updateAfterReaction();
}

// attach event listeners (if buttons exist)
if(likeBtn) likeBtn.addEventListener('click', like);
if(dislikeBtn) dislikeBtn.addEventListener('click', dislike);

// start
initReactions();
nextQuote();
const intervalId = setInterval(nextQuote, 10000);
