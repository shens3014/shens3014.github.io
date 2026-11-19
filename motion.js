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

const scenarios = {
  agent: [
    ['拆解', '比较两家公司：先确定报告期与币种，再拆成两条财报查询。'],
    ['并行', '两条查询独立执行，各自保留来源与调用标识。'],
    ['校验', '两份结果已返回。核对单位与期间，确认数据可以比较。'],
    ['归并', '将计算结果与两份来源绑定，交付可核验的回答。']
  ],
  web: [
    ['订阅', '浏览器订阅会话，按序显示服务端发出的事件。'],
    ['断线', '模拟网络中断。浏览器最后收到的事件序号是 12。'],
    ['续传', '携带序号 12 重新连接，从事件 13 开始补齐。'],
    ['归并', '按调用标识合并工具结果，恢复同一轮对话的状态。']
  ],
  quant: [
    ['收盘', '模拟日 T 收盘，完整成交量可用，生成待执行信号。'],
    ['排队', '信号进入下一交易日的待成交队列。'],
    ['撮合', '模拟 T+1 开盘，检查可交易状态，按设定滑点撮合。'],
    ['记账', '将成交价格和费用计入成本，记录信号日与成交日。']
  ]
};
let mode = 'agent';
let step = 0;
const timeline = document.querySelector('.timeline');
const next = document.querySelector('.next');
function updateConsole() {
  const phases = scenarios[mode];
  timeline.replaceChildren(...phases.map(([name], index) => {
    const item = document.createElement('span');
    item.className = 'step' + (index === step ? ' active' : '');
    item.textContent = name;
    if (index === step) item.setAttribute('aria-current','step');
    return item;
  }));
  document.querySelector('.readout').textContent = phases[step][1];
  next.textContent = step === phases.length - 1 ? '重新推演' : '执行下一步';
}
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  step = 0;
  for (const option of document.querySelectorAll('[data-mode]')) option.setAttribute('aria-pressed', String(option === button));
  updateConsole();
  staticOrAnimate();
}));
next.addEventListener('click', () => {
  step = (step + 1) % scenarios[mode].length;
  updateConsole();
  staticOrAnimate();
});
updateConsole();

const canvas = document.querySelector('.field');
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let width, height, frame, elapsed = 0, previous = 0, onscreen = true;
const pointer = { targetX: 0, targetY: 0, x: 0, y: 0 };
function sculptureLayout(w, h) {
  const compact = w < 750;
  return {
    x: w * (compact ? .69 : .75),
    y: h * (compact ? .28 : .49),
    scale: Math.min(w * (compact ? .35 : .21), h * (compact ? .35 : .52))
  };
}
const palettes = {agent:[210,279,157], web:[154,215,183], quant:[276,333,45]};
function paint(now) {
  frame = 0;
  if (!ctx || !onscreen || document.hidden) return;
  const dt = previous ? Math.min(now - previous, 80) / 1000 : 1 / 60;
  previous = now;
  if (!reduced.matches) elapsed += dt;
  const follow = 1 - Math.exp(-dt / .085);
  pointer.x += (pointer.targetX - pointer.x) * follow;
  pointer.y += (pointer.targetY - pointer.y) * follow;
  ctx.clearRect(0,0,width,height);
  const layout = sculptureLayout(width, height);
  const scale = layout.scale;
  const cx = layout.x + scale * .13 * pointer.x;
  const cy = layout.y + scale * .10 * pointer.y;
  const yaw = pointer.x * .88;
  const pitch = .90 - pointer.y * .58;
  const roll = -.51 + pointer.x * .12;
  const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  const cosRoll = Math.cos(roll), sinRoll = Math.sin(roll);
  const phase=elapsed*.15+step*.18, colors=palettes[mode];
  ctx.globalCompositeOperation='lighter';
  // Nested filaments follow a twisted torus, lit along their projected depth.
  for (let strand=0;strand<90;strand++) {
    const v=strand/89, angle=v*Math.PI*2;
    const hue=v<.62 ? colors[0]+(colors[1]-colors[0])*v/.62 : colors[1]+(colors[2]-colors[1])*(v-.62)/.38;
    ctx.strokeStyle='hsla('+hue+',95%,'+(50+18*v)+'%,'+(.23+.35*Math.pow(Math.sin(angle*.5),2))+')';
    ctx.lineWidth=.75+.55*v;
    ctx.beginPath();
    for(let j=0;j<=180;j++){
      const u=j*Math.PI/90;
      const twist=angle+2*u+phase;
      const radius=.83+.29*Math.cos(twist)+.1*Math.cos(3*u+phase);
      const x=radius*Math.cos(u), y=radius*Math.sin(u), z=.37*Math.sin(twist)+.29*Math.sin(2*u+phase);
      const rx = x*cosYaw + z*sinYaw;
      const rz = z*cosYaw - x*sinYaw;
      const py = y*cosPitch - rz*sinPitch;
      const depth = y*sinPitch + rz*cosPitch;
      const k=scale/(1-.18*depth);
      const px=cx+k*(rx*cosRoll-py*sinRoll);
      const sy=cy+k*(rx*sinRoll+py*cosRoll);
      if(j===0) ctx.moveTo(px,sy); else ctx.lineTo(px,sy);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';
  if (!reduced.matches) frame=requestAnimationFrame(paint);
}
function staticOrAnimate(){
  if (!frame && onscreen && !document.hidden) frame=requestAnimationFrame(paint);
}
new ResizeObserver(()=>{
  width=canvas.clientWidth;height=canvas.clientHeight;
  const dpr=Math.min(devicePixelRatio,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx?.setTransform(dpr,0,0,dpr,0,0);
  staticOrAnimate();
}).observe(canvas);
new IntersectionObserver(([entry])=>{onscreen=entry.isIntersecting;previous=0;staticOrAnimate()}).observe(canvas);
const stage = document.querySelector('.stage');
function centerPointer() {
  pointer.targetX = pointer.targetY = 0;
}
stage.addEventListener('pointermove', event => {
  if (reduced.matches || event.pointerType === 'touch') return;
  const rect = canvas.getBoundingClientRect();
  const layout = sculptureLayout(rect.width, rect.height);
  if (!layout.scale) return;
  const clamp = value => Math.max(-1, Math.min(1, value));
  pointer.targetX = clamp((event.clientX - rect.left - layout.x) / layout.scale);
  pointer.targetY = clamp((event.clientY - rect.top - layout.y) / layout.scale);
});
stage.addEventListener('pointerleave', centerPointer);
stage.addEventListener('pointercancel', centerPointer);
window.addEventListener('blur', centerPointer);
document.addEventListener('visibilitychange',()=>{previous=0;staticOrAnimate()});
reduced.addEventListener('change', () => {
  centerPointer();
  pointer.x = pointer.y = 0;
  staticOrAnimate();
});
