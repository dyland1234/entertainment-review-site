let allReviews = [];

/* ========= LOAD JSON ========= */
async function loadReviews(){
  try{
    const res = await fetch("reviews.json");
    allReviews = await res.json();

    // init page
    if(document.getElementById("reviews-container")){
      initHome();
    }
    if(document.getElementById("review-detail")){
      initReview();
    }
  }catch(err){
    console.error("Failed to load reviews.json", err);
  }
}

/* ========= THEME ========= */
const THEME_KEY = "er-theme";
function loadTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light") document.body.classList.add("light");
  updateToggleIcon();
}
function toggleTheme(){
  document.body.classList.toggle("light");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("light") ? "light" : "dark");
  updateToggleIcon();
}
function updateToggleIcon(){
  const btn = document.getElementById("themeToggle");
  if(!btn) return;
  btn.textContent = document.body.classList.contains("light") ? "☀️" : "🌙";
}

/* ========= STARS ========= */
function stars(n=0){ return "⭐".repeat(Math.max(0, Math.min(5, n))); }

/* ========= HOMEPAGE ========= */
let currentCategory = "All";
let currentQuery = "";

function initHome(){
  const hero = document.getElementById("hero");
  const grid = document.getElementById("reviews-container");
  if(!grid) return;

  const featured = [...allReviews].sort((a,b)=> b.rating-a.rating)[0] || allReviews[0];
  hero.innerHTML = `
    <a class="hero-card" href="review.html?id=${featured.id}">
      <div class="hero-media"><img src="${featured.image}" alt="${featured.title}"/></div>
      <div class="hero-overlay">
        <div class="hero-meta">
          <div class="hero-kicker">
            <span class="k-badge">${featured.category}</span>
            <span class="k-stars">${stars(featured.rating)}</span>
          </div>
          <h2 class="hero-title">${featured.title}</h2>
          <p class="muted">${featured.snippet || ""}</p>
        </div>
      </div>
    </a>
  `;

  renderGrid(allReviews);

  document.querySelectorAll(".chip[data-cat]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      currentCategory = btn.dataset.cat;
      filterAndRender();
    });
  });

  const sb = document.getElementById("searchBar");
  sb.addEventListener("input", (e)=>{
    currentQuery = e.target.value.trim().toLowerCase();
    filterAndRender();
  });
}

function filterAndRender(){
  let list = allReviews;

  if(currentCategory !== "All"){
    list = list.filter(r => r.category === currentCategory);
  }
  if(currentQuery){
    list = list.filter(r =>
      r.title.toLowerCase().includes(currentQuery) ||
      (r.snippet||"").toLowerCase().includes(currentQuery) ||
      (r.content||"").toLowerCase().includes(currentQuery) ||
      r.category.toLowerCase().includes(currentQuery)
    );
  }
  renderGrid(list);
}

function renderGrid(list){
  const grid = document.getElementById("reviews-container");
  const empty = document.getElementById("emptyState");
  if(!grid) return;

  if(list.length === 0){
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  grid.innerHTML = list.map(r => `
    <article class="card">
      <a href="review.html?id=${r.id}" aria-label="${r.title}">
        <div class="thumb"><img src="${r.image}" alt="${r.title}"/></div>
        <div class="c-body">
          <span class="tag">${r.category}</span>
          <h3 class="c-title">${r.title}</h3>
          <p class="c-snippet">${r.snippet || ""}</p>
          <div class="starline">${stars(r.rating)} <span class="muted">(${r.rating}/5)</span></div>
        </div>
      </a>
    </article>
  `).join("");
}

/* ========= REVIEW PAGE ========= */
function initReview(){
  const container = document.getElementById("review-detail");
  if(!container) return;

  const id = Number(new URLSearchParams(location.search).get("id"));
  const r = allReviews.find(x => x.id === id);
  if(!r){
    container.innerHTML = `<p>Review not found.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="article-hero">
      <div class="media"><img src="${r.image}" alt="${r.title}"></div>
    </div>
    <div class="article-head">
      <div class="meta-row">
        <span class="tag">${r.category}</span>
        <span class="article-stars">${stars(r.rating)} <span class="muted">(${r.rating}/5)</span></span>
      </div>
      <h1 class="article-title">${r.title}</h1>
    </div>
    <div class="article-content">
      <p>${(r.content || "").replace(/\n/g, "<br>")}</p>

      <div class="proscons">
        <div class="box pros">
          <h3>✅ Pros</h3>
          <ul>${(r.pros||[]).map(p=>`<li>${p}</li>`).join("")}</ul>
        </div>
        <div class="box cons">
          <h3>❌ Cons</h3>
          <ul>${(r.cons||[]).map(c=>`<li>${c}</li>`).join("")}</ul>
        </div>
      </div>
    </div>
  `;

  setupComments(id);
  renderRelated(r.category, id);
}

/* ========= COMMENTS ========= */
function keyForComments(id){ return `er-comments-${id}`; }

function loadComments(id){
  try{ return JSON.parse(localStorage.getItem(keyForComments(id))) || []; }
  catch{ return []; }
}
function saveComments(id, arr){ localStorage.setItem(keyForComments(id), JSON.stringify(arr)); }

function setupComments(id){
  const listEl = document.getElementById("commentList");
  const countEl = document.getElementById("commentCount");
  const inputEl = document.getElementById("commentInput");
  const postBtn = document.getElementById("commentPost");

  let comments = loadComments(id);

  function render(){
    countEl.textContent = `(${comments.length})`;
    listEl.innerHTML = comments.map(c => `
      <div class="comment" data-cid="${c.cid}">
        <div class="txt">${escapeHtml(c.text)}</div>
        <div class="vote">
          <button class="icon-btn up">👍</button>
          <span class="count">${c.up||0}</span>
          <button class="icon-btn down">👎</button>
          <span class="count">${c.down||0}</span>
        </div>
      </div>
    `).join("");
  }

  function addComment(){
    const text = (inputEl.value || "").trim();
    if(!text) return;
    const cid = Date.now().toString(36);
    comments.push({ cid, text, up:0, down:0 });
    saveComments(id, comments);
    inputEl.value = "";
    render();
  }

  listEl.addEventListener("click", e=>{
    const row = e.target.closest(".comment");
    if(!row) return;
    const cid = row.dataset.cid;
    const idx = comments.findIndex(c=>c.cid===cid);
    if(idx<0) return;

    if(e.target.classList.contains("up")){
      comments[idx].up++;
    }else if(e.target.classList.contains("down")){
      comments[idx].down++;
    }
    saveComments(id, comments);
    render();
  });

  postBtn.addEventListener("click", addComment);
  render();
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ========= RELATED ========= */
function renderRelated(category, excludeId){
  const host = document.getElementById("related");
  const related = allReviews.filter(r => r.category===category && r.id!==excludeId).slice(0,3);
  if(!related.length) return;
  host.innerHTML = `
    <h2>Related Reviews</h2>
    <div class="related-grid">
      ${related.map(r=>`
        <article class="related-card">
          <a href="review.html?id=${r.id}">
            <div class="thumb"><img src="${r.image}" alt="${r.title}"></div>
            <div class="c-body">
              <span class="tag">${r.category}</span>
              <h3 class="c-title">${r.title}</h3>
              <div class="starline">${stars(r.rating)}</div>
            </div>
          </a>
        </article>
      `).join("")}
    </div>
  `;
}

/* ========= BOOT ========= */
document.addEventListener("DOMContentLoaded", ()=>{
  loadTheme();
  const tbtn = document.getElementById("themeToggle");
  if(tbtn) tbtn.addEventListener("click", toggleTheme);

  // Load reviews from JSON
  loadReviews();
});
