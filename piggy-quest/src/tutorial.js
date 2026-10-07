/** Interactive instructions advance only after actual controls are used. */
(function(P){
 'use strict';
 const steps=[['저금통을 지키며 모험해요','몬스터를 처치해 코인을 모으고 조수를 강화하세요. 저금통이 깨지면 원정 코인을 잃어요. 오른쪽으로 걸어보세요.'],['점프로 피할 수 있어요','↑ 점프 버튼이나 스페이스로 뛰어보세요. 이동 조이스틱과 동시에 누를 수 있어요.'],['발차기와 두 주먹','공격 버튼 한 번은 발차기, 빠르게 두 번은 펀치입니다. 키보드는 K / J. 공격해보세요.'],['저금통을 함께 데려가요','저금통 가까이에서 E를 눌러 들어보세요. 운반 중에는 발차기가 가능하고 펀치는 흐리게 표시됩니다.'],['지도로 길을 찾아요','⌘ 지도 버튼 또는 M을 눌러보세요. 빨간 점이 현위치, ✓는 몬스터를 모두 처치한 구역입니다.'],['첫 전투','E로 저금통을 내려놓고 몬스터 한 마리를 처치하세요. 조수도 함께 싸웁니다. 쓰러져도 10초 뒤 저금통에서 부활해요.']];
 const event=kind=>{const t=P.state.tutorial;if(!t||t.complete||!P.state.active||P.state.selectedMap!=='wind')return;
   const want=['move','jump','attack','interact','map','kill'][t.step];if(kind!==want)return;t.step++;if(t.step>=steps.length){t.complete=true;P.UI.toast('튜토리얼 완료! 표지판에서 다른 구역으로 이동하고 모든 일반 몬스터를 처치하세요. 귀환하면 원정 코인 절반을 가져와요.');}P.State.save(P.state);};
 function tick(g){if(!P.state.tutorial.complete&&g.map.id==='wind'&&g.player.walkDistance>70)event('move');}
 function draw(c,g){const card=typeof document==='undefined'?null:document.getElementById('tutorial-card');if(!card)return;const t=P.state.tutorial;card.hidden=!!t?.complete||g.map.id!=='wind'||g.player.hp<=0||!!g.travel;if(card.hidden)return;const a=steps[t.step];if(!a){card.hidden=true;return;}card.replaceChildren();const title=document.createElement('strong');title.textContent=`튜토리얼 ${t.step+1} / ${steps.length} · ${a[0]}`;card.append(title,document.createTextNode(a[1]));}

 P.Tutorial={steps,event,tick,draw};
})(globalThis.PIGGY=globalThis.PIGGY||{});
