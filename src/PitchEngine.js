export function PitchEngine() {
  const svg = document.getElementById("pitch-svg");
  if (!svg) return;

  const NS = "http://www.w3.org/2000/svg";
  const svgW = 700,
    svgH = 450;
  // Pitch boundaries (playable area)
  const PX1 = 56,
    PX2 = 644,
    PY1 = 46,
    PY2 = 404;

  // ── SVG helpers ────────────────────────────────────────────
  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  // ── Player definitions ─────────────────────────────────────
  // Team A = Brazil (blue), Team B = France (amber)
  const TEAM_A_COLOR = "#adc6ff",
    TEAM_A_FILTER = "glow-blue";
  const TEAM_B_COLOR = "#ffb786",
    TEAM_B_FILTER = "glow-amber";

  // Waypoints: each player cycles through a list of positions
  // [x, y] in SVG coordinate space
  const playerDefs = [
    // Team A — left side
    { team: "A", num: "1", speed: 0, gk: true, pos: [{ x: 68, y: 225 }] },
    {
      team: "A",
      num: "3",
      speed: 0.35,
      pos: [
        { x: 120, y: 155 },
        { x: 130, y: 185 },
        { x: 115, y: 215 },
        { x: 120, y: 155 },
      ],
    },
    {
      team: "A",
      num: "5",
      speed: 0.38,
      pos: [
        { x: 125, y: 295 },
        { x: 140, y: 265 },
        { x: 130, y: 245 },
        { x: 125, y: 295 },
      ],
    },
    {
      team: "A",
      num: "4",
      speed: 0.36,
      pos: [
        { x: 170, y: 200 },
        { x: 185, y: 230 },
        { x: 175, y: 260 },
        { x: 170, y: 200 },
      ],
    },
    {
      team: "A",
      num: "8",
      speed: 0.42,
      pos: [
        { x: 240, y: 175 },
        { x: 265, y: 195 },
        { x: 250, y: 225 },
        { x: 240, y: 175 },
      ],
    },
    {
      team: "A",
      num: "6",
      speed: 0.4,
      pos: [
        { x: 245, y: 270 },
        { x: 265, y: 250 },
        { x: 255, y: 280 },
        { x: 245, y: 270 },
      ],
    },
    {
      team: "A",
      num: "10",
      speed: 0.55,
      pos: [
        { x: 310, y: 195 },
        { x: 335, y: 210 },
        { x: 320, y: 240 },
        { x: 295, y: 220 },
        { x: 310, y: 195 },
      ],
    },
    {
      team: "A",
      num: "11",
      speed: 0.52,
      pos: [
        { x: 300, y: 265 },
        { x: 285, y: 245 },
        { x: 315, y: 255 },
        { x: 300, y: 265 },
      ],
    },
    // Team B — right side
    { team: "B", num: "1", speed: 0, gk: true, pos: [{ x: 632, y: 225 }] },
    {
      team: "B",
      num: "2",
      speed: 0.35,
      pos: [
        { x: 580, y: 155 },
        { x: 565, y: 185 },
        { x: 575, y: 215 },
        { x: 580, y: 155 },
      ],
    },
    {
      team: "B",
      num: "5",
      speed: 0.38,
      pos: [
        { x: 575, y: 295 },
        { x: 560, y: 265 },
        { x: 570, y: 245 },
        { x: 575, y: 295 },
      ],
    },
    {
      team: "B",
      num: "4",
      speed: 0.36,
      pos: [
        { x: 530, y: 200 },
        { x: 515, y: 230 },
        { x: 525, y: 260 },
        { x: 530, y: 200 },
      ],
    },
    {
      team: "B",
      num: "8",
      speed: 0.42,
      pos: [
        { x: 460, y: 175 },
        { x: 435, y: 195 },
        { x: 450, y: 225 },
        { x: 460, y: 175 },
      ],
    },
    {
      team: "B",
      num: "6",
      speed: 0.4,
      pos: [
        { x: 455, y: 270 },
        { x: 435, y: 250 },
        { x: 445, y: 280 },
        { x: 455, y: 270 },
      ],
    },
    {
      team: "B",
      num: "10",
      speed: 0.55,
      pos: [
        { x: 390, y: 195 },
        { x: 365, y: 210 },
        { x: 380, y: 240 },
        { x: 405, y: 220 },
        { x: 390, y: 195 },
      ],
    },
    {
      team: "B",
      num: "7",
      speed: 0.52,
      pos: [
        { x: 400, y: 265 },
        { x: 415, y: 245 },
        { x: 385, y: 255 },
        { x: 400, y: 265 },
      ],
    },
  ];

  // Runtime state per player
  const players = playerDefs.map((d, i) => ({
    ...d,
    x: d.pos[0].x,
    y: d.pos[0].y,
    tx: d.pos[0].x,
    ty: d.pos[0].y,
    wpIdx: 0,
    wpT: 0,
    hasBall: false,
    id: "player-" + i,
    shadowId: "shadow-" + i,
  }));

  // Build DOM elements once
  const shadowsG = document.getElementById("shadows-group");
  const playersG = document.getElementById("players-group");
  const ballG = document.getElementById("ball-group");
  const trailsG = document.getElementById("trails-group");

  players.forEach((p) => {
    const color = p.team === "A" ? TEAM_A_COLOR : TEAM_B_COLOR;
    const filter = p.team === "A" ? TEAM_A_FILTER : TEAM_B_FILTER;

    // Shadow ellipse
    const sh = el("ellipse", {
      cx: p.x,
      cy: p.y + 7,
      rx: 6,
      ry: 2.5,
      fill: "rgba(0,0,0,.35)",
      id: p.shadowId,
    });
    shadowsG.appendChild(sh);

    // Player group: ring + dot + number
    const g = el("g", { id: p.id, cursor: "pointer" });
    if (!p.gk) {
      // Outer ring (team colour)
      g.appendChild(
        el("circle", {
          cx: 0,
          cy: 0,
          r: 7,
          fill: color + "22",
          stroke: color,
          "stroke-width": "1.2",
          filter: `url(#${filter})`,
        }),
      );
      // Inner fill
      g.appendChild(
        el("circle", {
          cx: 0,
          cy: 0,
          r: 4.5,
          fill: color,
          filter: `url(#${filter})`,
        }),
      );
    } else {
      const gkColor = p.team === "A" ? "#a5f3fc" : "#fbbf24";
      g.appendChild(
        el("circle", {
          cx: 0,
          cy: 0,
          r: 8,
          fill: gkColor + "33",
          stroke: gkColor,
          "stroke-width": "1.5",
          filter: `url(#${filter})`,
        }),
      );
      g.appendChild(
        el("circle", {
          cx: 0,
          cy: 0,
          r: 5.5,
          fill: gkColor,
          filter: `url(#${filter})`,
        }),
      );
    }
    // Jersey number
    const txt = el("text", {
      x: 0,
      y: 4,
      "text-anchor": "middle",
      "font-size": "5.5",
      "font-weight": "800",
      "font-family": "JetBrains Mono,monospace",
      fill: p.team === "A" ? "#002e6a" : "#502400",
      "pointer-events": "none",
    });
    txt.textContent = p.num;
    g.appendChild(txt);
    g.setAttribute("transform", `translate(${p.x},${p.y})`);
    playersG.appendChild(g);
  });

  // Ball DOM element
  const ballOuter = el("circle", {
    cx: 0,
    cy: 0,
    r: 7,
    fill: "url(#ball-glow)",
    filter: "url(#glow-white)",
    opacity: ".95",
    id: "ball-outer",
  });
  const ballInner = el("circle", { cx: 0, cy: 0, r: 4.5, fill: "white" });
  // Pentagon pattern lines
  const ballG2 = el("g", {});
  ballG2.appendChild(ballOuter);
  ballG2.appendChild(ballInner);
  // Seam lines
  [0, 72, 144, 216, 288].forEach((a) => {
    const rad = (a * Math.PI) / 180;
    const line = el("line", {
      x1: 0,
      y1: 0,
      x2: Math.cos(rad) * 4,
      y2: Math.sin(rad) * 4,
      stroke: "rgba(0,0,0,.25)",
      "stroke-width": ".8",
    });
    ballG2.appendChild(line);
  });
  ballG.appendChild(ballG2);

  // ── Ball physics state ──────────────────────────────────────
  let ball = { x: 335, y: 220 };
  let ballVx = 0,
    ballVy = 0;
  let ballTargetPlayer = null; // player index ball is heading to
  let ballOwner = null; // player index who currently has the ball
  let ballMoving = false;
  let passTimer = 0;
  const PASS_INTERVAL = 90; // frames between passes

  function pickPassTarget(ownerIdx) {
    // Pick a random teammate (same team, not same player)
    const owner = players[ownerIdx];
    const teammates = players
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => p.team === owner.team && i !== ownerIdx);
    if (!teammates.length) return null;
    return teammates[Math.floor(Math.random() * teammates.length)].i;
  }

  function kickoff() {
    // Give ball to a random field player
    const field = players.filter((_, i) => !players[i].gk);
    const pick = Math.floor(Math.random() * field.length);
    ballOwner = players.indexOf(field[pick]);
    ball.x = players[ballOwner].x;
    ball.y = players[ballOwner].y;
    ballMoving = false;
    passTimer = PASS_INTERVAL;
  }

  function shootToGoal(ownerIdx) {
    // Occasionally shoot at goal
    const p = players[ownerIdx];
    const goalX = p.team === "A" ? 645 : 55;
    const goalY = 196 + Math.random() * 58;
    const dx = goalX - p.x,
      dy = goalY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spd = 6.5;
    ballVx = (dx / dist) * spd;
    ballVy = (dy / dist) * spd;
    ballMoving = true;
    ballOwner = null;
    ballTargetPlayer = -1; // heading to goal
    return { gx: goalX, gy: goalY };
  }

  function triggerGoal(scoringTeam) {
    // Update score
    const sa = document.getElementById("score-a");
    const sb = document.getElementById("score-b");
    if (!sa || !sb) return;
    if (scoringTeam === "A")
      sa.textContent = String(Number(sa.textContent) + 1);
    else sb.textContent = String(Number(sb.textContent) + 1);
    // Goal flash
    const fl = document.getElementById("goal-flash");
    if (fl) {
      fl.classList.remove("firing");
      void fl.offsetWidth;
      fl.classList.add("firing");
    }
    // Event badge
    spawnBadge("⚽ GOAL!");
    setTimeout(kickoff, 2000);
  }

  function spawnBadge(text) {
    const section = document.getElementById("map-section");
    if (!section) return;
    const b = document.createElement("div");
    b.className = "event-badge";
    b.textContent = text;
    b.style.left = 35 + Math.random() * 30 + "%";
    b.style.top = 35 + Math.random() * 15 + "%";
    section.appendChild(b);
    setTimeout(() => b.remove(), 2500);
  }

  // ── Trail drawing ───────────────────────────────────────────
  function drawTrail(x1, y1, x2, y2, color) {
    const line = el("line", {
      x1,
      y1,
      x2,
      y2,
      stroke: color,
      "stroke-width": "1.8",
      opacity: ".8",
      "stroke-linecap": "round",
      "stroke-dasharray": "180",
      "stroke-dashoffset": "180",
    });
    // Animate dashoffset
    const anim = el("animate", {
      attributeName: "stroke-dashoffset",
      from: "180",
      to: "0",
      dur: ".4s",
      fill: "freeze",
    });
    const fade = el("animate", {
      attributeName: "opacity",
      from: ".8",
      to: "0",
      dur: "1s",
      begin: ".4s",
      fill: "freeze",
    });
    line.appendChild(anim);
    line.appendChild(fade);
    trailsG.appendChild(line);
    setTimeout(() => {
      if (line.parentNode) line.parentNode.removeChild(line);
    }, 1500);
  }

  // ── Player waypoint movement ────────────────────────────────
  function updatePlayers() {
    players.forEach((p, idx) => {
      if (p.gk) return; // GKs stay (slight drift handled separately)
      if (idx === ballOwner) {
        // Player with ball dribbles toward next waypoint more purposefully
        p.wpT += p.speed * 0.016;
      } else {
        p.wpT += p.speed * 0.012;
      }
      if (p.wpT >= 1) {
        p.wpT = 0;
        p.wpIdx = (p.wpIdx + 1) % p.pos.length;
      }
      const cur = p.pos[p.wpIdx];
      const nxt = p.pos[(p.wpIdx + 1) % p.pos.length];
      // Smooth lerp
      p.x = cur.x + (nxt.x - cur.x) * easeInOut(p.wpT);
      p.y = cur.y + (nxt.y - cur.y) * easeInOut(p.wpT);
    });
    // GK drift
    players
      .filter((p) => p.gk)
      .forEach((p) => {
        p.y = p.pos[0].y + Math.sin(Date.now() * 0.0008) * 14;
        p.x = p.pos[0].x + Math.sin(Date.now() * 0.0005) * 4;
      });
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // ── Ball update ─────────────────────────────────────────────
  let goalShotTimer = 0;
  const GOAL_SHOT_INTERVAL = 420; // frames

  function updateBall() {
    passTimer--;
    goalShotTimer--;

    if (ballMoving) {
      const prevX = ball.x,
        prevY = ball.y;
      ball.x += ballVx;
      ball.y += ballVy;

      if (ballTargetPlayer !== null && ballTargetPlayer >= 0) {
        // Check if reached target player
        const tp = players[ballTargetPlayer];
        const dx = tp.x - ball.x,
          dy = tp.y - ball.y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          ballOwner = ballTargetPlayer;
          ballMoving = false;
          ballTargetPlayer = null;
          passTimer = PASS_INTERVAL;
          ball.x = tp.x;
          ball.y = tp.y;
        }
      } else if (ballTargetPlayer === -1) {
        // Shot heading to goal — check bounds
        if (ball.x < PX1 - 5 || ball.x > PX2 + 5) {
          // Goal!
          const scoringTeam = ballVx < 0 ? "A" : "B";
          triggerGoal(scoringTeam);
          ballMoving = false;
          ballTargetPlayer = null;
        }
        // Bounced off top/bottom
        if (ball.y < PY1 || ball.y > PY2) {
          ballVy *= -0.7;
          ball.y = Math.max(PY1, Math.min(PY2, ball.y));
        }
      }
      // Friction
      ballVx *= 0.97;
      ballVy *= 0.97;
    } else if (ballOwner !== null) {
      // Ball follows owner with slight lag
      const o = players[ballOwner];
      ball.x += (o.x - ball.x) * 0.18;
      ball.y += (o.y - ball.y) * 0.18;

      // Trigger pass
      if (passTimer <= 0) {
        // Occasionally shoot at goal
        if (goalShotTimer <= 0 && Math.random() < 0.2) {
          const prevBall = { x: ball.x, y: ball.y };
          const { gx, gy } = shootToGoal(ballOwner);
          const color =
            players[ballOwner].team === "A" ? TEAM_A_COLOR : TEAM_B_COLOR;
          drawTrail(prevBall.x, prevBall.y, gx, gy, color);
          goalShotTimer = GOAL_SHOT_INTERVAL;
          spawnBadge("👟 SHOT!");
        } else {
          const tgt = pickPassTarget(ballOwner);
          if (tgt !== null) {
            const prevBall = { x: ball.x, y: ball.y };
            const tp = players[tgt];
            const dx = tp.x - ball.x,
              dy = tp.y - ball.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const spd = 3.5 + Math.random() * 2;
            ballVx = (dx / dist) * spd;
            ballVy = (dy / dist) * spd;
            ballMoving = true;
            ballTargetPlayer = tgt;
            const color =
              players[ballOwner].team === "A" ? TEAM_A_COLOR : TEAM_B_COLOR;
            drawTrail(prevBall.x, prevBall.y, tp.x, tp.y, color);
            ballOwner = null;
          }
        }
      }
    }
  }

  // ── Render loop ─────────────────────────────────────────────
  function render() {
    // Players
    players.forEach((p) => {
      const g = document.getElementById(p.id);
      const sh = document.getElementById(p.shadowId);
      if (g)
        g.setAttribute(
          "transform",
          `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`,
        );
      if (sh) {
        sh.setAttribute("cx", p.x.toFixed(1));
        sh.setAttribute("cy", (p.y + 7).toFixed(1));
      }
    });
    // Ball
    ballG2.setAttribute(
      "transform",
      `translate(${ball.x.toFixed(1)},${ball.y.toFixed(1)}) rotate(${Date.now() * 0.15})`,
    );
  }

  // ── Crowd wave ──────────────────────────────────────────────
  function buildCrowdWave() {
    const northG = document.getElementById("wave-north");
    const southG = document.getElementById("wave-south");
    if (!northG || !southG) return;
    const segW = 22,
      count = Math.floor(590 / segW);
    for (let i = 0; i < count; i++) {
      const nx = 55 + i * segW;
      const rn = el("rect", {
        x: nx,
        y: 25,
        width: segW - 1,
        height: 20,
        rx: 1,
        fill: "rgba(255,200,120,1)",
      });
      const anim = el("animate", {
        attributeName: "opacity",
        values: "0.08;0.35;0.08",
        dur: "3s",
        begin: i * 0.06 + "s",
        repeatCount: "indefinite",
      });
      rn.appendChild(anim);
      northG.appendChild(rn);

      const rs = el("rect", {
        x: nx,
        y: 405,
        width: segW - 1,
        height: 20,
        rx: 1,
        fill: "rgba(255,200,120,1)",
      });
      const anim2 = el("animate", {
        attributeName: "opacity",
        values: "0.06;0.28;0.06",
        dur: "3s",
        begin: i * 0.06 + 1.5 + "s",
        repeatCount: "indefinite",
      });
      rs.appendChild(anim2);
      southG.appendChild(rs);
    }
  }

  // ── Init ────────────────────────────────────────────────────
  kickoff();
  buildCrowdWave();

  // Main animation loop
  function loop() {
    updatePlayers();
    updateBall();
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Goal celebration auto-trigger demo after 8 s
  setTimeout(() => {
    if (ballOwner !== null) {
      shootToGoal(ballOwner);
    }
  }, 8000);

  // ── Incident checkboxes
  document
    .querySelectorAll('#tab-incident input[type="checkbox"]')
    .forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const c = e.target.closest(".p-3");
        if (c) c.style.opacity = e.target.checked ? "0.55" : "1";
      });
    });

  // ── Live WebSocket Telemetry ──
  const wsUrl = window.location.hostname === "localhost" 
    ? "ws://localhost:8000/ws/telemetry" 
    : `wss://${window.location.host}/ws/telemetry`;
  
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "NEW_INCIDENT") {
        if (window.showToast) {
          window.showToast(`🚨 NEW INCIDENT: Sector ${msg.data.sector} - ${msg.data.type}`);
        }
        spawnBadge(`🚨 ${msg.data.type}`);
      }
    } catch (e) {
      console.error("WebSocket message error", e);
    }
  };
  ws.onclose = () => console.log("WebSocket telemetry disconnected.");
}
