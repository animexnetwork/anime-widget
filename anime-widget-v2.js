var CARDS_DESKTOP=3, CARDS_MOBILE=2;
var LATEST_LIMIT=10; // shudhu latest 10 ta post niye carousel cholbe
var RANKS=["SSS","SS","S","A","B","C","D","E","F","G"];
var ORDER={SSS:10,SS:9,S:8,A:7,B:6,C:5,D:4,E:3,F:2,G:1};
var RC={
  SSS:{bg:"linear-gradient(135deg,#FFD700,#FFAA00)",tx:"#000",glow:"#FFD700"},
  SS: {bg:"linear-gradient(135deg,#FFA500,#FF7800)",tx:"#000",glow:"#FFA500"},
  S:  {bg:"linear-gradient(135deg,#6C63FF,#4B44CC)",tx:"#fff",glow:"#6C63FF"},
  A:  {bg:"linear-gradient(135deg,#8B5CF6,#6D28D9)",tx:"#fff",glow:"#8B5CF6"},
  B:  {bg:"linear-gradient(135deg,#3B82F6,#1D4ED8)",tx:"#fff",glow:"#3B82F6"},
  C:  {bg:"linear-gradient(135deg,#10B981,#047857)",tx:"#fff",glow:"#10B981"},
  D:  {bg:"linear-gradient(135deg,#6B7280,#4B5563)",tx:"#fff",glow:"#9ca3af"},
  E:  {bg:"linear-gradient(135deg,#4B5563,#374151)",tx:"#fff",glow:"#6b7280"},
  F:  {bg:"linear-gradient(135deg,#DC2626,#991B1B)",tx:"#fff",glow:"#DC2626"},
  G:  {bg:"linear-gradient(135deg,#7F1D1D,#450A0A)",tx:"#fff",glow:"#991b1b"}
};

var allCards=[], currentIdx=0;

/* ==========================
   SEEN HISTORY
========================== */
var STORAGE_KEY="anime_seen_cards_v1";

function getSeen(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
  }catch(e){
    return [];
  }
}

function saveSeen(list){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(list));
}

function markSeen(cards){
  var seen=getSeen();

  cards.forEach(function(c){
    if(c.slug && seen.indexOf(c.slug)===-1){
      seen.push(c.slug);
    }
  });

  saveSeen(seen);
}

/* ==========================
   SHUFFLE
========================== */
function shuffle(arr){
  var a=arr.slice();

  for(var i=a.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var t=a[i];
    a[i]=a[j];
    a[j]=t;
  }

  return a;
}

function getAnimeSlug(c){var m=(c||"").match(/var\s+ANIME_SLUG\s*=\s*["']([^"']+)["']/);return m?m[1]:"";}
function hasMarker(c){return(c||"").includes("<!--top-anime-section-->");}
var FALLBACK_IMG="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='560' viewBox='0 0 400 560'%3E%3Crect width='400' height='560' fill='%23d8d8e0'/%3E%3Ctext x='200' y='280' font-family='sans-serif' font-size='22' fill='%23999' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
function getImage(e){
  if(e.content&&e.content.$t){var m=e.content.$t.match(/<img[^>]+src="([^"]+)"/i);if(m&&m[1])return m[1];}
  return FALLBACK_IMG;
}
function getLink(e){
  if(!e||!e.link)return"#";
  var a=e.link.find(function(l){return l.rel==="alternate";});return a?a.href:"#";
}
function getAnimeData(c){
  try{
    var d=document.createElement("div");d.innerHTML=c||"";
    var s=d.querySelector('script.anime-data[type="application/json"]');
    if(!s)return null;return JSON.parse(s.textContent.trim());
  }catch(e){return null;}
}
function getPublished(e){
  return e.published&&e.published.$t?new Date(e.published.$t).getTime():0;
}
function processEntries(entries){
  var cards=[];
  for(var i=0;i<entries.length;i++){
    var e=entries[i];
    var title=e.title&&e.title.$t?e.title.$t:"Untitled";
    var link=getLink(e);
    var content=e.content&&e.content.$t?e.content.$t:"";
    if(!hasMarker(content))continue;
    cards.push({
      title:title,link:link,image:getImage(e),
      meta:getAnimeData(content),slug:getAnimeSlug(content),
      published:getPublished(e)
    });
  }
  return cards;
}

function buildCard(c){
  var genres=c.meta&&c.meta.genres&&c.meta.genres.length?c.meta.genres:[];
  var genreHTML=genres.slice(0,3).map(function(g){return'<span class="genre-tag">'+g+'</span>';}).join("");
  return '<div class="character-card" data-slug="'+c.slug+'">'
    +'<a href="'+c.link+'">'
    +'<div class="card-img-wrap">'
    +'<img src="'+c.image+'" loading="lazy" alt="'+c.title+'" onerror="this.onerror=null;this.src=\''+FALLBACK_IMG+'\';">'
    +'<div class="card-top-badges">'
    +'<span class="avg-rank-badge"><span class="badge-letter">?</span></span>'
    +'</div>'
    +'<div class="genre-tags">'+genreHTML+'</div>'
    +'</div>'
    +'<div class="card-body">'
    +'<div class="card-title">'+c.title+'</div>'
    +'</div></a></div>';
}

function getMaxCards(){return window.innerWidth<=640?CARDS_MOBILE:CARDS_DESKTOP;}

function render(cards,idx){
  var el=document.getElementById("anime-pages");if(!el)return;
  var max=getMaxCards(),total=cards.length,start=idx||0,visible=[];
  for(var i=0;i<max&&i<total;i++)visible.push(cards[(start+i)%total]);
  el.innerHTML=visible.map(buildCard).join("");
  el.style.gridTemplateColumns="repeat("+Math.min(max,visible.length)+",1fr)";
  loadCardRanks();
  markSeen(visible); // currently dekhano cards seen hisebe mark hocche
}

function loadCardRanks(){
  if(typeof firebase==="undefined")return;
  document.querySelectorAll(".character-card").forEach(function(card){
    var slug=card.dataset.slug;if(!slug)return;
    firebase.database().ref("ratings/"+slug).once("value").then(function(snap){
      var data=snap.val()||{};
      var arr=Object.values(data);if(!arr.length)return;
      var sum=0;arr.forEach(function(r){sum+=ORDER[r.rank]||0;});
      var avg=Math.round(sum/arr.length);
      var rank=RANKS.find(function(r){return ORDER[r]===avg;})||"?";
      var badge=card.querySelector(".avg-rank-badge");
      var letter=badge?badge.querySelector(".badge-letter"):null;
      if(!badge)return;
      if(letter)letter.textContent=rank;
      if(RC[rank]){
        badge.style.background=RC[rank].bg;
        badge.style.color=RC[rank].tx;
        badge.style.setProperty("--badge-glow",RC[rank].glow);
      }
      badge.classList.add("glow-ready");
    });
  });
}

function setupArrows(){
  var outer=document.querySelector(".carousel-outer");
  var L=document.getElementById("arrow-left"),R=document.getElementById("arrow-right");

  // ek click = ek pura page shift (mobile=2, pc=3), latest 10-er moddhe wrap korbe
  if(L)L.addEventListener("click",function(){
    if(!allCards.length)return;
    var step=getMaxCards();
    currentIdx=(currentIdx-step+allCards.length*10)%allCards.length;
    render(allCards,currentIdx);
  });
  if(R)R.addEventListener("click",function(){
    if(!allCards.length)return;
    var step=getMaxCards();
    currentIdx=(currentIdx+step)%allCards.length;
    render(allCards,currentIdx);
  });
}

window.getAnimePages=function(json){
  var entries=json&&json.feed&&json.feed.entry?json.feed.entry:[];
  var processed=processEntries(entries);
  // latest first (published date descending), tarpor shudhu latest 10 ta rakha
  processed.sort(function(a,b){return b.published-a.published;});
  var latest=processed.slice(0,LATEST_LIMIT);

  // seen-prioritize: unseen cards age dekhabe, tarpor seen cards
  // dutoi group nijer moddhe shuffled thakbe
  var seen=getSeen();
  var unseenCards=latest.filter(function(c){return !c.slug||seen.indexOf(c.slug)===-1;});
  var seenCards=latest.filter(function(c){return c.slug&&seen.indexOf(c.slug)!==-1;});

  allCards=shuffle(unseenCards).concat(shuffle(seenCards));
  currentIdx=0;
  render(allCards,currentIdx);
};

window.addEventListener("resize",function(){render(allCards,currentIdx);});

function loadPages(){
  var s=document.createElement("script");
  s.src="/feeds/pages/default?alt=json-in-script&max-results=500&callback=getAnimePages";
  s.async=true;document.body.appendChild(s);
}

document.addEventListener("DOMContentLoaded",function(){setupArrows();loadPages();});
