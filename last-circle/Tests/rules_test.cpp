#include "LCRules.h"
#include <cstdlib>
#include <iostream>
#include <limits>
void check(bool condition, const char* scenario) {
 if (!condition) { std::cerr << "FAIL: " << scenario << '\n'; std::exit(1); }
}
int main() {
 using namespace LCRules;
 for (int humans=1;humans<=10;++humans) {
  check(CanStart(humans,true,true),"host may start with 1 through 10 humans");
  check(humans+BotsToFill(humans)==10,"every allowed roster contains exactly ten combatants");
  check(!CanStart(humans,false,true),"match cannot be restarted in progress");
  check(!CanStart(humans,true,false),"guest cannot start the match");
 }
 check(!CanStart(0,true,true)&&!CanStart(11,true,true),"empty and over-capacity rooms rejected");
 check(BotsToFill(10)==0&&BotsToFill(4)==6&&BotsToFill(1)==9,"specified human and bot scenarios");
 check(!Outside(0,0,0,0,100)&&!Outside(100,0,0,0,100),"safe center and boundary do not take zone damage");
 check(Outside(101,0,0,0,100)&&Outside(0,-101,0,0,100),"damage applies beyond the zone in both axes");
 float previous=ZoneRadius(0);
 for(int phase=1;phase<=ZonePhases;++phase) {
  float next=ZoneRadius(phase);check(next<previous,"safe area decreases at every stage");
  check(LerpRadius(previous,next,0)==previous,"shrink starts at current radius");
  check(LerpRadius(previous,next,ShrinkSeconds)==next,"shrink ends exactly at target radius");
  check(LerpRadius(previous,next,200)==next,"delayed server tick cannot overshoot radius");
  check(ZoneDamage(phase)>=ZoneDamage(phase-1),"late-game damage never decreases");previous=next;
 }
 check(previous==0&&Outside(1,0,0,0,previous),"final zone closes completely");
 // A full magazine/reload/fire sequence must conserve ammunition.
 int magazine=0,reserve=67,fired=0;
 for(int tick=0;tick<100;++tick){
  if(magazine==0){int transfer=ReloadTransfer(magazine,30,reserve);magazine+=transfer;reserve-=transfer;}
  if(CanFire(true,true,false,magazine,tick,tick)){--magazine;++fired;}
  check(magazine>=0&&magazine<=30&&reserve>=0,"ammunition bounds maintained");
  check(magazine+reserve+fired==67,"reload cannot create ammunition");
 }
 check(fired==67,"last partial magazine is usable");
 check(!CanFire(false,true,false,30,10,0),"dead players cannot fire");
 check(!CanFire(true,false,false,30,10,0),"players on plane cannot fire");
 check(!CanFire(true,true,true,30,10,0),"reload blocks firing");
 check(!CanFire(true,true,false,0,10,0),"empty magazine blocks firing");
 check(!CanFire(true,true,false,30,10,10.1),"rate limiter rejects early shot");
 check(CanFire(true,true,false,30,10.1,10.1),"shot accepted at cooldown boundary");
 check(ReloadTransfer(30,30,60)==0&&ReloadTransfer(25,30,2)==2,"reload bounds and scarce reserve");
 std::cout << "PASS: roster, host permissions, zone lifecycle, ammo conservation, fire validation\n";
}
