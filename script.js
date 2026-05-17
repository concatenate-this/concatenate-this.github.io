/* ============================================================
   CIRCUIT CANVAS
============================================================ */
const canvas = document.getElementById('circuit-canvas');
const ctx = canvas.getContext('2d');

let W, H, nodes = [], traces = [];

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  initCircuit();
}

function initCircuit() {
  nodes = [];
  traces = [];
  const cols = Math.ceil(W / 80);
  const rows = Math.ceil(H / 80);

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (Math.random() > 0.45) {
        nodes.push({
          x: c * 80 + (Math.random() * 20 - 10),
          y: r * 80 + (Math.random() * 20 - 10),
          pulse: Math.random(),
          pulseSpeed: 0.004 + Math.random() * 0.006,
          active: Math.random() > 0.6,
        });
      }
    }
  }

  // Connect nearby nodes with traces
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120 && Math.random() > 0.5) {
        // Only orthogonal-ish traces (circuit style)
        const midX = Math.random() > 0.5 ? nodes[j].x : nodes[i].x;
        const midY = Math.random() > 0.5 ? nodes[i].y : nodes[j].y;
        traces.push({ a: i, b: j, midX, midY, flow: Math.random(), flowSpeed: 0.005 + Math.random() * 0.008 });
      }
    }
  }
}

function drawCircuit(ts) {
  ctx.clearRect(0, 0, W, H);

  // Traces
  traces.forEach(t => {
    t.flow = (t.flow + t.flowSpeed) % 1;
    const a = nodes[t.a], b = nodes[t.b];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(t.midX, t.midY);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(57,255,122,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Moving dot on trace
    if (a.active || b.active) {
      const px = lerp(lerp(a.x, t.midX, Math.min(t.flow * 2, 1)),
                       lerp(t.midX, b.x, Math.max(t.flow * 2 - 1, 0)),
                       t.flow > 0.5 ? 1 : 0);
      const py = lerp(lerp(a.y, t.midY, Math.min(t.flow * 2, 1)),
                       lerp(t.midY, b.y, Math.max(t.flow * 2 - 1, 0)),
                       t.flow > 0.5 ? 1 : 0);
      const dotX = t.flow < 0.5
        ? lerp(a.x, t.midX, t.flow * 2)
        : lerp(t.midX, b.x, (t.flow - 0.5) * 2);
      const dotY = t.flow < 0.5
        ? lerp(a.y, t.midY, t.flow * 2)
        : lerp(t.midY, b.y, (t.flow - 0.5) * 2);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(57,255,122,0.9)';
      ctx.fill();
    }
  });

  // Nodes
  nodes.forEach(n => {
    n.pulse = (n.pulse + n.pulseSpeed) % 1;
    const alpha = 0.3 + Math.sin(n.pulse * Math.PI * 2) * 0.3;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = n.active
      ? `rgba(57,255,122,${alpha + 0.3})`
      : `rgba(57,255,122,${alpha * 0.4})`;
    ctx.fill();
  });

  requestAnimationFrame(drawCircuit);
}

function lerp(a, b, t) { return a + (b - a) * t; }

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(drawCircuit);


/* ============================================================
   NAV — ACTIVE STATE + SMOOTH SCROLL
============================================================ */
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id], header.hero');

// Click: set active, smooth scroll
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// Scroll: highlight active section
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(l => {
        l.classList.toggle('active', l.dataset.section === id);
      });
    }
  });
}, { threshold: 0.4 });

document.querySelectorAll('section[id]').forEach(s => sectionObserver.observe(s));


/* ============================================================
   SCROLL REVEAL
============================================================ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.section-header, .about-grid, .commit-section, .projects-grid, .contact-grid, .project-card, .contact-card, .about-text, .about-stats')
  .forEach((el, i) => {
    el.classList.add('reveal');
    el.dataset.delay = i * 60;
    revealObserver.observe(el);
  });


/* ============================================================
   GITHUB API — STATS + LIVE REPOS
============================================================ */
const GH_USER = 'concatenate-this';

async function fetchGitHub() {
  try {
    // User stats
    const userRes = await fetch(`https://api.github.com/users/${GH_USER}`);
    if (userRes.ok) {
      const user = await userRes.json();
      document.getElementById('gh-repos').textContent = user.public_repos ?? '--';
      document.getElementById('gh-followers').textContent = user.followers ?? '--';
    }

    // Latest repos
    const repoRes = await fetch(`https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=5`);
    if (repoRes.ok) {
      const repos = await repoRes.json();
      const filtered = repos.filter(r => !r.fork);
      if (filtered.length > 0) {
        const wrap = document.getElementById('live-repos-wrap');
        const list = document.getElementById('live-repos');
        wrap.style.display = 'block';
        list.innerHTML = filtered.map(r => `
          <a href="${r.html_url}" target="_blank" class="repo-item reveal">
            <span class="repo-name">${r.name}</span>
            <span class="repo-desc">${r.description || 'no description'}</span>
            <span class="repo-lang">${r.language || '—'}</span>
          </a>
        `).join('');
        // Observe newly added items
        list.querySelectorAll('.reveal').forEach((el, i) => {
          el.dataset.delay = i * 80;
          revealObserver.observe(el);
        });
      }
    }
  } catch (err) {
    console.warn('GitHub API fetch failed:', err);
  }
}

fetchGitHub();


/* ============================================================
   FOOTER YEAR
============================================================ */
document.getElementById('year').textContent = new Date().getFullYear();
