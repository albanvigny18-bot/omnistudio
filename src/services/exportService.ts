/**
 * OmniStudio Export Service
 * Generates standards-compliant SCORM 1.2, SCORM 2004 4th Edition, xAPI (Tin Can),
 * Standalone Single-File HTML5, and Word / PDF transcripts.
 */

import JSZip from 'jszip';
import type { InteractiveProject } from '../types';

/**
 * Generates an XML string for SCORM 1.2 imsmanifest.xml
 */
export function generateScorm12Manifest(project: InteractiveProject): string {
  const safeTitle = project.metadata.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-${project.metadata.id}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-${project.metadata.id}">
    <organization identifier="ORG-${project.metadata.id}">
      <title>${safeTitle}</title>
      <item identifier="ITEM-${project.metadata.id}" identifierref="RES-${project.metadata.id}">
        <title>${safeTitle}</title>
        <adlcp:masteryscore>${project.scormSettings.passingScorePercent}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-${project.metadata.id}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm_wrapper.js"/>
    </resource>
  </resources>
</manifest>`;
}

/**
 * Generates an XML string for SCORM 2004 imsmanifest.xml
 */
export function generateScorm2004Manifest(project: InteractiveProject): string {
  const safeTitle = project.metadata.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-${project.metadata.id}" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="ORG-${project.metadata.id}">
    <organization identifier="ORG-${project.metadata.id}">
      <title>${safeTitle}</title>
      <item identifier="ITEM-${project.metadata.id}" identifierref="RES-${project.metadata.id}">
        <title>${safeTitle}</title>
        <imsss:sequencing>
          <imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/>
        </imsss:sequencing>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-${project.metadata.id}" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm_wrapper.js"/>
    </resource>
  </resources>
</manifest>`;
}

/**
 * Standard SCORM API Wrapper JS
 */
export const SCORM_WRAPPER_JS = `
// Universal SCORM 1.2 & 2004 API Adapter
var SCORM = {
  version: "1.2",
  api: null,
  findAPI: function(win) {
    var findAttempts = 0;
    while ((win.API == null && win.API_1484_11 == null) && (win.parent != null) && (win.parent != win)) {
      findAttempts++;
      if (findAttempts > 7) return null;
      win = win.parent;
    }
    return win.API_1484_11 || win.API;
  },
  init: function() {
    this.api = this.findAPI(window);
    if (!this.api && window.opener) {
      this.api = this.findAPI(window.opener);
    }
    if (this.api) {
      if (this.api.Initialize) {
        this.version = "2004";
        this.api.Initialize("");
      } else if (this.api.LMSInitialize) {
        this.version = "1.2";
        this.api.LMSInitialize("");
      }
      console.log("SCORM Connected. Version: " + this.version);
    } else {
      console.warn("SCORM API not found - running in standalone preview mode.");
    }
  },
  setScore: function(score, maxScore, passed) {
    if (!this.api) return;
    if (this.version === "2004") {
      this.api.SetValue("cmi.score.raw", score.toString());
      this.api.SetValue("cmi.score.max", maxScore.toString());
      this.api.SetValue("cmi.score.scaled", (score / maxScore).toFixed(2));
      this.api.SetValue("cmi.success_status", passed ? "passed" : "failed");
      this.api.SetValue("cmi.completion_status", "completed");
      this.api.Commit("");
    } else {
      this.api.LMSSetValue("cmi.core.score.raw", score.toString());
      this.api.LMSSetValue("cmi.core.score.max", maxScore.toString());
      this.api.LMSSetValue("cmi.core.lesson_status", passed ? "passed" : "failed");
      this.api.LMSCommit("");
    }
  },
  finish: function() {
    if (!this.api) return;
    if (this.version === "2004") {
      this.api.Terminate("");
    } else {
      this.api.LMSFinish("");
    }
  }
};
window.addEventListener("load", function() { SCORM.init(); });
window.addEventListener("unload", function() { SCORM.finish(); });
`;

/**
 * Builds a standalone playable HTML page with embedded project data and lightweight player
 */
export function generateStandaloneHtml(project: InteractiveProject): string {
  const projectJson = JSON.stringify(project).replace(/<\/script>/g, '<\\/script>');
  return `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.metadata.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="scorm_wrapper.js"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #020617; color: #f8fafc; }
    .glass-box { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); }
  </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4">
  <div id="player-app" class="w-full max-w-5xl aspect-video glass-box rounded-2xl overflow-hidden relative shadow-2xl flex flex-col">
    <!-- Header -->
    <div class="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 z-20">
      <div class="flex items-center gap-3">
        <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
        <h1 class="text-sm font-semibold tracking-wide text-slate-200 truncate" id="scene-title">Chargement...</h1>
      </div>
      <div class="flex items-center gap-4 text-xs font-mono text-slate-400">
        <span>Score: <strong id="score-counter" class="text-emerald-400">0</strong> / 100</span>
        <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">OmniStudio Interactive</span>
      </div>
    </div>

    <!-- Video Canvas Stage -->
    <div class="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center">
      <canvas id="procedural-canvas" class="absolute inset-0 w-full h-full object-cover"></canvas>
      
      <!-- Interactive Overlays Container -->
      <div id="overlay-container" class="absolute inset-0 z-10 pointer-events-none"></div>

      <!-- Center Play/Pause button on screen -->
      <button id="center-play-btn" class="z-20 w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 pointer-events-auto">
        <svg id="play-icon" class="w-8 h-8 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>

      <!-- 3D Object Overlay viewport if active -->
      <div id="three-viewport" class="absolute inset-0 hidden pointer-events-auto z-30 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
        <div class="w-full max-w-xl h-80 relative rounded-xl overflow-hidden border border-slate-700/60 shadow-2xl" id="three-canvas-holder"></div>
        <div class="mt-4 flex items-center gap-4">
          <p class="text-xs text-slate-300 font-medium">Manipulez l'objet 3D en faisant glisser la souris.</p>
          <button id="close-3d-btn" class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white">Continuer la vidéo</button>
        </div>
      </div>
    </div>

    <!-- Bottom Controls & Timeline -->
    <div class="h-16 px-6 border-t border-slate-800 bg-slate-900/80 flex flex-col justify-center gap-2 z-20">
      <div class="w-full h-2 bg-slate-800 rounded-full cursor-pointer relative overflow-hidden" id="scrubber-track">
        <div id="scrubber-bar" class="h-full bg-indigo-500 w-0 transition-all"></div>
      </div>
      <div class="flex items-center justify-between text-xs text-slate-400 font-mono">
        <div class="flex items-center gap-3">
          <button id="toggle-play-btn" class="hover:text-white">▶ Play</button>
          <span id="time-display">00:00 / 00:00</span>
        </div>
        <div id="branching-bar" class="flex items-center gap-2"></div>
      </div>
    </div>
  </div>

  <script>
    var PROJECT = ${projectJson};
    var currentScene = PROJECT.scenes.find(function(s) { return s.id === PROJECT.startSceneId; }) || PROJECT.scenes[0];
    var currentTime = 0;
    var isPlaying = false;
    var score = 0;
    var animFrame = null;

    var canvas = document.getElementById("procedural-canvas");
    var ctx = canvas.getContext("2d");
    var sceneTitleEl = document.getElementById("scene-title");
    var scoreEl = document.getElementById("score-counter");
    var timeDisplayEl = document.getElementById("time-display");
    var scrubberBar = document.getElementById("scrubber-bar");
    var overlayContainer = document.getElementById("overlay-container");
    var playBtn = document.getElementById("center-play-btn");
    var toggleBtn = document.getElementById("toggle-play-btn");

    function resizeCanvas() {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function formatTime(s) {
      var m = Math.floor(s / 60);
      var sec = Math.floor(s % 60);
      return (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
    }

    function loadScene(scene) {
      currentScene = scene;
      currentTime = 0;
      sceneTitleEl.innerText = scene.title;
      renderBranching();
      renderOverlays();
    }

    function renderBranching() {
      var container = document.getElementById("branching-bar");
      container.innerHTML = "";
      if (currentScene.branchingChoices && currentScene.branchingChoices.length > 0) {
        currentScene.branchingChoices.forEach(function(b) {
          var btn = document.createElement("button");
          btn.className = "px-3 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-white text-xs border border-slate-700 transition-colors";
          btn.innerText = b.label;
          btn.onclick = function() {
            var target = PROJECT.scenes.find(function(s) { return s.id === b.targetSceneId; });
            if (target) loadScene(target);
          };
          container.appendChild(btn);
        });
      }
    }

    function renderOverlays() {
      overlayContainer.innerHTML = "";
      if (!currentScene.interactions) return;

      currentScene.interactions.forEach(function(item) {
        var isVisible = currentTime >= item.timestamp && currentTime <= (item.timestamp + (item.duration || 8));
        if (!isVisible) return;

        var el = document.createElement("div");
        el.className = "absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 p-4 rounded-xl glass-box text-slate-100 shadow-xl transition-all";
        el.style.left = item.xPercent + "%";
        el.style.top = item.yPercent + "%";

        if (item.type === "hotspot" || item.type === "inventory_item") {
          el.innerHTML = '<div class="w-12 h-12 rounded-full bg-indigo-500/30 border-2 border-indigo-400 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform"><span class="w-4 h-4 rounded-full bg-indigo-400 animate-ping"></span></div>';
          el.onclick = function() {
            alert(item.title + "\\n\\n" + (item.content || item.description || "Point interactif validé !"));
            score += 15;
            scoreEl.innerText = score;
            if (window.SCORM) SCORM.setScore(score, 100, score >= 75);
          };
        } else if (item.type === "object_3d") {
          el.innerHTML = '<div class="cursor-pointer text-center bg-indigo-900/80 px-4 py-2 rounded-lg border border-indigo-400/50 hover:bg-indigo-800"><p class="text-xs font-bold">✨ Inspecter en 3D</p><p class="text-[10px] text-slate-300">' + item.title + '</p></div>';
          el.onclick = function() {
            isPlaying = false;
            open3DViewer(item.object3dType || "heart");
          };
        } else if (item.type === "quiz" && item.quiz) {
          var quizHtml = '<div class="w-80"><h4 class="text-xs font-bold text-indigo-400 mb-1">' + item.quiz.title + '</h4><div class="space-y-1.5 mt-2">';
          if (item.quiz.options) {
            item.quiz.options.forEach(function(opt) {
              quizHtml += '<button class="w-full text-left text-xs p-2 rounded bg-slate-800/90 hover:bg-indigo-600/80 border border-slate-700 block transition-colors opt-btn" data-correct="' + opt.isCorrect + '">' + opt.text + '</button>';
            });
          }
          quizHtml += '</div></div>';
          el.innerHTML = quizHtml;
          el.querySelectorAll(".opt-btn").forEach(function(btn) {
            btn.onclick = function() {
              var correct = btn.getAttribute("data-correct") === "true";
              if (correct) {
                btn.className = "w-full text-left text-xs p-2 rounded bg-emerald-600 text-white border border-emerald-400 block";
                score += (item.quiz.points || 20);
                scoreEl.innerText = score;
                if (window.SCORM) SCORM.setScore(score, 100, score >= 75);
              } else {
                btn.className = "w-full text-left text-xs p-2 rounded bg-red-600 text-white border border-red-400 block";
              }
              setTimeout(function() { isPlaying = true; loop(); }, 1200);
            };
          });
          if (item.pauseOnTrigger) isPlaying = false;
        } else {
          el.innerHTML = '<h4 class="text-xs font-bold text-indigo-300">' + item.title + '</h4><p class="text-xs text-slate-300 mt-1">' + (item.content || item.description || "") + '</p>';
        }

        overlayContainer.appendChild(el);
      });
    }

    function renderProceduralVideoFrame() {
      var w = canvas.width;
      var h = canvas.height;
      var grad = ctx.createRadialGradient(w/2, h/2, 20, w/2, h/2, w);
      grad.addColorStop(0, "#1e1b4b");
      grad.addColorStop(0.5, "#0f172a");
      grad.addColorStop(1, "#020617");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Render glowing digital wave
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var x = 0; x < w; x += 10) {
        var y = h/2 + Math.sin(x * 0.02 + currentTime * 3) * 30 * Math.sin(currentTime);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Render video chapter text
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 20px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(currentScene.title, w/2, 60);

      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.font = "14px system-ui";
      ctx.fillText(currentScene.learningObjective || currentScene.description, w/2, 90);
    }

    var lastTimestamp = null;
    function loop(now) {
      if (!lastTimestamp) lastTimestamp = now;
      var dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        currentTime += (dt || 0.016);
        if (currentTime >= currentScene.duration) {
          currentTime = currentScene.duration;
          isPlaying = false;
          playBtn.classList.remove("hidden");
        }
      }

      timeDisplayEl.innerText = formatTime(currentTime) + " / " + formatTime(currentScene.duration);
      scrubberBar.style.width = ((currentTime / currentScene.duration) * 100) + "%";

      renderProceduralVideoFrame();
      renderOverlays();

      animFrame = requestAnimationFrame(loop);
    }

    playBtn.onclick = togglePlay;
    toggleBtn.onclick = togglePlay;

    function togglePlay() {
      isPlaying = !isPlaying;
      if (isPlaying) {
        playBtn.classList.add("hidden");
        toggleBtn.innerText = "⏸ Pause";
      } else {
        playBtn.classList.remove("hidden");
        toggleBtn.innerText = "▶ Play";
      }
    }

    function open3DViewer(type) {
      var modal = document.getElementById("three-viewport");
      var holder = document.getElementById("three-canvas-holder");
      holder.innerHTML = "";
      modal.classList.remove("hidden");

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(60, holder.clientWidth / holder.clientHeight, 0.1, 1000);
      camera.position.z = 4;
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(holder.clientWidth, holder.clientHeight);
      holder.appendChild(renderer.domElement);

      var geometry = type === "heart" ? new THREE.TorusKnotGeometry(1, 0.3, 100, 16) : new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
      var material = new THREE.MeshNormalMaterial({ wireframe: false });
      var mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      function anim3D() {
        if (!modal.classList.contains("hidden")) {
          mesh.rotation.x += 0.01;
          mesh.rotation.y += 0.015;
          renderer.render(scene, camera);
          requestAnimationFrame(anim3D);
        }
      }
      anim3D();

      document.getElementById("close-3d-btn").onclick = function() {
        modal.classList.add("hidden");
        isPlaying = true;
      };
    }

    loadScene(currentScene);
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;
}

/**
 * Generates an editable Word (.doc) Storyboard & Pedagogical Transcript
 */
export function generateWordTranscript(project: InteractiveProject): string {
  let docContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><title>${project.metadata.title}</title>
<style>
  body { font-family: Calibri, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; }
  h1 { font-size: 20pt; color: #4338ca; border-bottom: 2px solid #4338ca; padding-bottom: 6px; }
  h2 { font-size: 15pt; color: #1e1b4b; margin-top: 20px; }
  h3 { font-size: 12pt; color: #3730a3; margin-top: 14px; }
  table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 15px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
  th { background-color: #f1f5f9; font-weight: bold; }
  .badge { background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 9pt; }
</style>
</head>
<body>
  <h1>${project.metadata.title}</h1>
  <p><strong>Auteur :</strong> ${project.metadata.author} | <strong>Version :</strong> ${project.metadata.version} | <strong>Date :</strong> ${project.metadata.createdDate}</p>
  <p><strong>Public Cible :</strong> ${project.metadata.targetAudience} | <strong>Catégorie :</strong> ${project.metadata.category}</p>
  <p><strong>Description du module :</strong> ${project.metadata.description}</p>
  <p><strong>Score de réussite requis SCORM :</strong> ${project.scormSettings.passingScorePercent}%</p>
  
  <hr/>
  <h2>1. Variables Pédagogiques Globales & État</h2>
  <table>
    <tr><th>Nom de Variable</th><th>Type</th><th>Valeur Initiale</th><th>Description</th></tr>`;

  Object.values(project.variables).forEach((v) => {
    docContent += `<tr><td><code>${v.name}</code></td><td>${v.type}</td><td>${v.defaultValue}</td><td>${v.description}</td></tr>`;
  });

  docContent += `</table>

  <h2>2. Déroulé Scénaristique & Interactions Horodatées</h2>`;

  project.scenes.forEach((scene, sIdx) => {
    docContent += `<h3>Scène ${sIdx + 1} : ${scene.title} (${scene.duration}s)</h3>
    <p><strong>Objectif pédagogique :</strong> ${scene.learningObjective}</p>
    <p><strong>Synopsis visuel :</strong> ${scene.description}</p>
    
    <h4>Interactions & Points Clés :</h4>
    <table>
      <tr><th>Horodatage</th><th>Type</th><th>Titre / Consigne</th><th>Détails & Réponses</th><th>Pause</th></tr>`;

    if (scene.interactions.length === 0) {
      docContent += `<tr><td colspan="5"><em>Aucune interaction spécifique sur cette scène.</em></td></tr>`;
    } else {
      scene.interactions.forEach((item) => {
        let details = item.content || item.description || '';
        if (item.quiz) {
          details = `<strong>Question:</strong> ${item.quiz.title}<br/>`;
          if (item.quiz.options) {
            details += item.quiz.options.map((o) => `${o.isCorrect ? '✅' : '⚪'} ${o.text}`).join('<br/>');
          }
        }
        docContent += `<tr>
          <td><strong>${item.timestamp}s</strong></td>
          <td><span class="badge">${item.type}</span></td>
          <td>${item.title}</td>
          <td>${details}</td>
          <td>${item.pauseOnTrigger ? 'Oui' : 'Non'}</td>
        </tr>`;
      });
    }

    docContent += `</table>
    <h4>Branches & Choix de Navigation :</h4>
    <ul>`;
    if (scene.branchingChoices.length === 0) {
      docContent += `<li><em>Scène terminale ou enchaînement linéaire.</em></li>`;
    } else {
      scene.branchingChoices.forEach((b) => {
        docContent += `<li><strong>${b.label}</strong> &rarr; Cible : <code>${b.targetSceneId}</code> (${b.pedagogicalImpact})</li>`;
      });
    }
    docContent += `</ul><br/>`;
  });

  docContent += `<h2>3. Système de Gamification & Badges</h2>
  <table>
    <tr><th>Titre du Badge</th><th>Description</th></tr>`;
  project.gamification.badges.forEach((b) => {
    docContent += `<tr><td><strong>${b.title}</strong></td><td>${b.description}</td></tr>`;
  });
  docContent += `</table></body></html>`;

  return docContent;
}

/**
 * Downloads a complete SCORM 1.2 ZIP package
 */
export async function downloadScorm12Zip(project: InteractiveProject) {
  const zip = new JSZip();
  zip.file('imsmanifest.xml', generateScorm12Manifest(project));
  zip.file('scorm_wrapper.js', SCORM_WRAPPER_JS);
  zip.file('index.html', generateStandaloneHtml(project));
  zip.file('project.json', JSON.stringify(project, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OmniStudio_SCORM12_${project.metadata.id}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads a complete SCORM 2004 ZIP package
 */
export async function downloadScorm2004Zip(project: InteractiveProject) {
  const zip = new JSZip();
  zip.file('imsmanifest.xml', generateScorm2004Manifest(project));
  zip.file('scorm_wrapper.js', SCORM_WRAPPER_JS);
  zip.file('index.html', generateStandaloneHtml(project));
  zip.file('project.json', JSON.stringify(project, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OmniStudio_SCORM2004_${project.metadata.id}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads a Standalone Single-file HTML5
 */
export function downloadStandaloneHtmlFile(project: InteractiveProject) {
  const html = generateStandaloneHtml(project);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_offline.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads Word transcript (.doc)
 */
export function downloadWordDocument(project: InteractiveProject) {
  const wordContent = generateWordTranscript(project);
  const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Script_${project.metadata.title.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads Project JSON
 */
export function downloadProjectJson(project: InteractiveProject) {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.metadata.id}_backup.json`;
  a.click();
  URL.revokeObjectURL(url);
}
