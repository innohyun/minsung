#include "LCBotController.h"
#include "Engine/World.h"
#include "LCCharacter.h"
#include "LCGameState.h"
#include "LCPickup.h"
#include "LCRules.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
ALCBotController::ALCBotController(){PrimaryActorTick.bCanEverTick=true;bWantsPlayerState=true;NextDrop=FMath::FRandRange(5,25);}
void ALCBotController::Tick(float Dt){
 Super::Tick(Dt);auto* C=Cast<ALCCharacter>(GetPawn());const auto* G=GetWorld()->GetGameState<ALCGameState>();
 if(!C||C->bDead||!G||G->Phase==ELCPhase::Finished)return;
 if(C->bOnPlane){NextDrop-=Dt;if(NextDrop<=0)C->DropFromPlane();return;}
 if(C->bParachute){Steer(FVector(0,0,C->GetActorLocation().Z));C->AddMovementInput(MovementIntent,1);return;}
 ThinkClock+=Dt;if(ThinkClock>=.2f){Think(ThinkClock);ThinkClock=0;}
 if(!C->bHealing)C->AddMovementInput(MovementIntent,1);
}
void ALCBotController::Steer(const FVector& To){
 auto* C=Cast<ALCCharacter>(GetPawn());if(!C)return;
 FVector Dir=(To-C->GetActorLocation()).GetSafeNormal2D();
 FHitResult H;FCollisionQueryParams Q;Q.AddIgnoredActor(C);
 const FVector Start=C->GetActorLocation();
 if(GetWorld()->SweepSingleByChannel(H,Start,Start+Dir*260,FQuat::Identity,ECC_Visibility,FCollisionShape::MakeSphere(45),Q)){
  const FVector Side=FVector::CrossProduct(Dir,FVector::UpVector);
  FHitResult SideHit;
  const bool Blocked=GetWorld()->SweepSingleByChannel(SideHit,Start,Start+Side*260,FQuat::Identity,ECC_Visibility,FCollisionShape::MakeSphere(45),Q);
  Dir=Blocked?-Side:Side;
 }
 MovementIntent=Dir;
 if(!Target.IsValid())SetControlRotation(Dir.Rotation());
}
void ALCBotController::Think(float Dt){
 auto* C=Cast<ALCCharacter>(GetPawn());const auto* G=GetWorld()->GetGameState<ALCGameState>();if(!C||!G)return;
 ALCCharacter* Seen=nullptr;float Best=10000.f*10000.f;
 for(TActorIterator<ALCCharacter> It(GetWorld());It;++It){
  if(*It==C||It->bDead||It->bOnPlane)continue;
  FVector Delta=It->GetActorLocation()-C->GetActorLocation();const float Dist=Delta.SizeSquared();
  if(Dist>Best || FVector::DotProduct(GetControlRotation().Vector(),Delta.GetSafeNormal())<.25f)continue;
  if(LineOfSightTo(*It)){Seen=*It;Best=Dist;}
 }
 if(Seen!=Target.Get())VisibleTime=0;
 Target=Seen; // Forget immediately when occluded: no wall tracking.
 const FVector P=C->GetActorLocation();
 const bool Outside=LCRules::Outside(P.X,P.Y,G->ZoneCenter.X,G->ZoneCenter.Y,FMath::Max(0.f,G->ZoneRadius-1000));
 if(C->Health<55&&C->Medkits>0&&!Seen)C->ServerHeal();
 if(C->bHealing)return;
 if(C->IsArmed()&&C->Ammo()==0)C->ServerReload();
 if(Seen&&C->IsArmed()){
  VisibleTime+=Dt;
  FVector Aim=(Seen->GetActorLocation()+FVector(0,0,30)-C->GetPawnViewLocation()).GetSafeNormal();
  SetControlRotation(Aim.Rotation());C->SetBotIntent(true,false);
  if(VisibleTime>.65f){
   const FVector Spread=FMath::VRandCone(Aim,FMath::DegreesToRadians(2.2f));C->ServerFire(Spread);
  }
  // Strafe near cover rather than charge directly into the opponent.
  const FVector Side=FVector::CrossProduct(Aim,FVector::UpVector)*(FMath::Sin(GetWorld()->GetTimeSeconds()*.7f)>0?700:-700);
  Steer(Outside?FVector(G->ZoneCenter.X,G->ZoneCenter.Y,0):P+Side);return;
 }
 C->SetBotIntent(false,true);
 if(Outside){Steer(FVector(G->ZoneCenter.X,G->ZoneCenter.Y,0));return;}
 ALCPickup* Loot=nullptr;Best=25000.f*25000.f;
 for(TActorIterator<ALCPickup> It(GetWorld());It;++It){
  const int K=It->Kind;
  if((K==0&&C->bHasRifle)||(K==1&&C->bHasPistol)||(K==2&&C->RifleReserve>=120)||(K==3&&C->Medkits>=2))continue;
  const float D=FVector::DistSquared(P,It->GetActorLocation());if(D<Best){Best=D;Loot=*It;}
 }
 if(Loot){if(Best<200*200)C->ServerInteract();else Steer(Loot->GetActorLocation());}
 else{
  if(Destination.IsNearlyZero()||FVector::DistSquared2D(P,Destination)<400*400)
   Destination=FVector(G->ZoneCenter.X+FMath::FRandRange(-1,1)*G->ZoneRadius*.6f,G->ZoneCenter.Y+FMath::FRandRange(-1,1)*G->ZoneRadius*.6f,0);
  Steer(Destination);
 }
}
