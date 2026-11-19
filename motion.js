const filters = document.querySelector('.filters');
const groups = document.querySelectorAll('.group');
filters.hidden = false;
filters.addEventListener('click', event => {
  const selected = event.target.closest('button');
  if (!selected) return;
  for (const button of filters.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button === selected));
  }
  for (const group of groups) {
    group.hidden = selected.dataset.filter !== 'all' && selected.dataset.filter !== group.dataset.category;
  }
});

const reveal = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('arrive');
      reveal.unobserve(entry.target);
    }
  }
});
document.querySelectorAll('article').forEach(article => reveal.observe(article));

function drawSculpture(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const points = [];
  const tau = 2 * Math.PI;
  // Sweep a dotted tube along a trefoil. Each cross-section lies normal to the curve.
  for (let ring = 0; ring < 184; ring++) {
    const t = tau * ring / 184;
    const c = Math.cos(2*t), s = Math.sin(2*t);
    const r = 1.23 + .48*Math.cos(3*t), dr = -1.44*Math.sin(3*t);
    const x = r*c, y = r*s, z = .66*Math.sin(3*t);
    const dx = dr*c - 2*r*s, dy = dr*s + 2*r*c, dz = 1.98*Math.cos(3*t);
    const len = Math.hypot(dx,dy,dz), xy = Math.hypot(dx,dy);
    const nx = -dy/xy, ny = dx/xy;
    for (let j = 0; j < 32; j++) {
      const u = tau*j/32, a = .28*Math.cos(u), b = .28*Math.sin(u);
      points.push([x+a*nx-b*dz*ny/len, y+a*ny+b*dz*nx/len, z+b*xy/len]);
    }
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let pitch = .57, yaw = -.28, targetPitch = pitch, targetYaw = yaw;
  let frame = 0, phase = 0, last = 0, visible = true, size = 0;
  function paint(now) {
    frame = 0;
    if (!visible || document.hidden) { last = 0; return; }
    if (!reduce.matches && last) phase += Math.min(now-last,50)*.00012;
    last = now;
    pitch += (targetPitch-pitch)*.08;
    yaw += (targetYaw-yaw)*.08;
    const ca=Math.cos(yaw+phase), sa=Math.sin(yaw+phase), cb=Math.cos(pitch), sb=Math.sin(pitch);
    const scale=size*.224;
    ctx.clearRect(0,0,size,size);
    const pixels = points.map(([x,y,z]) => {
      const depth=z*ca-x*sa;
      return [(x*ca+z*sa)*scale+size/2,(y*cb-depth*sb)*scale+size/2,y*sb+depth*cb];
    }).sort((a,b)=>a[2]-b[2]);
    for (const [x,y,depth] of pixels) {
      const light=Math.max(0,Math.min(1,(depth+2)/4));
      ctx.fillStyle='hsl('+ (253-13*light) +' 84% '+ (76-47*light) +'%)';
      const dot=size*(.0024+light*.0025);
      ctx.fillRect(x,y,dot,dot);
    }
    if (!reduce.matches) schedule();
  }
  function schedule() { if (!frame && visible && !document.hidden) frame=requestAnimationFrame(paint); }
  new ResizeObserver(() => {
    size=Math.round(canvas.clientWidth*Math.min(devicePixelRatio,1.5));
    canvas.width=canvas.height=size;
    schedule();
  }).observe(canvas);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;last=0;schedule()}).observe(canvas);
  canvas.addEventListener('pointermove', e=>{
    if (reduce.matches || e.pointerType==='touch') return;
    const box=canvas.getBoundingClientRect();
    targetYaw=-.28+((e.clientX-box.left)/box.width-.5)*.8;
    targetPitch=.57+((e.clientY-box.top)/box.height-.5)*.65;
  });
  canvas.addEventListener('pointerleave',()=>{targetYaw=-.28;targetPitch=.57});
  reduce.addEventListener('change',schedule);
  document.addEventListener('visibilitychange',()=>{last=0;schedule()});
  schedule();
}
drawSculpture(document.querySelector('canvas'));
