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
let aim = 0, tilt = 0;
const palettes = {agent:[210,279,157], web:[154,215,183], quant:[276,333,45]};
function paint(now) {
  frame = 0;
  if (!ctx || !onscreen || document.hidden) return;
  if (previous && !reduced.matches) elapsed += Math.min(now-previous,80)/1000;
  previous = now;
  tilt += (aim-tilt)*.05;
  ctx.clearRect(0,0,width,height);
  const mobile = width < 750;
  const cx=width*(mobile?.69:.75), cy=height*(mobile?.28:.49);
  const scale=Math.min(width*(mobile?.35:.21),height*(mobile?.35:.52));
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
      const py=.62*y-.78*z, depth=.78*y+.62*z;
      const k=scale/(1-.18*depth);
      const roll=-.51+tilt*.12;
      const px=cx+k*(x*Math.cos(roll)-py*Math.sin(roll));
      const sy=cy+k*(x*Math.sin(roll)+py*Math.cos(roll));
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
document.querySelector('.stage').addEventListener('pointermove',e=>{if(!reduced.matches) aim=e.clientX/width-.5});
document.addEventListener('visibilitychange',()=>{previous=0;staticOrAnimate()});
reduced.addEventListener('change',staticOrAnimate);
