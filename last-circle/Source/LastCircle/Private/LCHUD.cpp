#include "LCHUD.h"
#include "Engine/World.h"
#include "LCCharacter.h"
#include "LCGameState.h"
#include "LCPickup.h"
#include "LCRules.h"
#include "Engine/Canvas.h"
#include "EngineUtils.h"
void ALCHUD::DrawHUD(){
 Super::DrawHUD();if(!Canvas||!PlayerOwner)return;
 const auto* G=GetWorld()->GetGameState<ALCGameState>();if(!G||G->Phase==ELCPhase::Lobby)return;
 const float W=Canvas->ClipX,H=Canvas->ClipY;
 const auto* C=Cast<ALCCharacter>(PlayerOwner->GetPawn());
 DrawRect(FLinearColor(0,0,0,.6f),W-220,24,196,70);
 DrawText(FString::Printf(TEXT("%d ALIVE"),G->Alive),FColor::White,W-202,34,nullptr,1.6f);
 DrawText(FString::Printf(TEXT("ZONE %d  %s %ds"),G->ZoneStage,G->bShrinking?TEXT("CLOSING"):TEXT("WAIT"),FMath::Max(0,int(G->PhaseEnds-G->GetServerWorldTimeSeconds()))),FColor::Cyan,W-202,67);
 DrawText(FString::Printf(TEXT("%.0f"),FMath::Fmod(PlayerOwner->GetControlRotation().Yaw+360,360.f)),FColor::White,W/2-15,25,nullptr,1.2f);
 if(C&&!C->bDead){
  const float X=W/2,Y=H/2;
  DrawLine(X-10,Y,X-4,Y,FLinearColor::White);DrawLine(X+4,Y,X+10,Y,FLinearColor::White);
  DrawLine(X,Y-10,X,Y-4,FLinearColor::White);DrawLine(X,Y+4,X,Y+10,FLinearColor::White);
  DrawRect(FLinearColor(0,0,0,.7f),W/2-180,H-90,360,58);
  DrawRect(FLinearColor(.15f,.2f,.2f),W/2-160,H-51,320,10);
  DrawRect(FLinearColor(.45f,.85f,.7f),W/2-160,H-51,320*C->Health/100,10);
  DrawText(C->IsArmed()?FString::Printf(TEXT("%s  %d / %d"),C->Weapon==0?TEXT("RIFLE"):TEXT("PISTOL"),C->Ammo(),C->Reserve()):TEXT("UNARMED - FIND A WEAPON"),FColor::White,W/2-150,H-82,nullptr,1.3f);
  if(C->bReloading||C->bHealing)DrawText(C->bHealing?TEXT("HEALING..."):TEXT("RELOADING..."),FColor::Yellow,W/2-70,H/2+50);
  if(C->bOnPlane)DrawText(TEXT("SPACE - DROP"),FColor::White,W/2-100,H*.72f,nullptr,1.5f);
  else if(C->bParachute)DrawText(TEXT("WASD - STEER PARACHUTE"),FColor::White,W/2-130,H*.72f);
  ALCPickup* Loot=nullptr;float Best=220*220;
  for(TActorIterator<ALCPickup> It(GetWorld());It;++It){float D=FVector::DistSquared(C->GetActorLocation(),It->GetActorLocation());if(D<Best){Best=D;Loot=*It;}}
  if(Loot)DrawText(TEXT("F - PICK UP ")+ALCPickup::Label(Loot->Kind),FColor::Yellow,W/2-100,H/2+85);
  const FVector P=C->GetActorLocation();
  if(G->Phase==ELCPhase::Battle&&LCRules::Outside(P.X,P.Y,G->ZoneCenter.X,G->ZoneCenter.Y,G->ZoneRadius))
   DrawText(TEXT("OUTSIDE SAFE ZONE - MOVE IN"),FColor::Cyan,W/2-165,90,nullptr,1.4f);
  if(bInventoryOpen){
   DrawRect(FLinearColor(.02f,.03f,.05f,.94f),35,100,360,235);
   DrawText(TEXT("INVENTORY"),FColor::White,55,120,nullptr,1.5f);
   DrawText(FString::Printf(TEXT("[1] RIFLE: %s  %d + %d"),C->bHasRifle?TEXT("EQUIPPED"):TEXT("EMPTY"),C->RifleAmmo,C->RifleReserve),FColor::White,55,165);
   DrawText(FString::Printf(TEXT("[2] PISTOL: %s  %d + %d"),C->bHasPistol?TEXT("AVAILABLE"):TEXT("EMPTY"),C->PistolAmmo,C->PistolReserve),FColor::White,55,200);
   DrawText(FString::Printf(TEXT("[H] MEDKITS: %d / 5"),C->Medkits),FColor::White,55,235);
   DrawText(TEXT("[TAB] CLOSE"),FColor::Silver,55,290);
  }
 }else DrawText(TEXT("ELIMINATED / V - NEXT SURVIVOR"),FColor::White,W/2-170,H-60,nullptr,1.3f);
 if(bMapOpen){float Size=FMath::Min(H-100,W-100);Map((W-Size)/2,(H-Size)/2,Size);}else Map(W-224,H-244,200);
}
void ALCHUD::Map(float X,float Y,float S){
 auto* G=GetWorld()->GetGameState<ALCGameState>();if(!G)return;
 DrawRect(FLinearColor(.025f,.08f,.065f,.95f),X,Y,S,S);
 auto XY=[X,Y,S](FVector2D P){return FVector2D(X+(P.X+16000)/32000*S,Y+(P.Y+16000)/32000*S);};
 for(int a=-2;a<=2;++a)for(int b=-2;b<=2;++b){FVector2D P=XY(FVector2D(a*4800-1000,b*4800-1000));DrawRect(FLinearColor(.35f,.37f,.32f),P.X,P.Y,S/16,S/16);}
 auto Circle=[this,XY,S,X,Y](FVector2D C,float R,FLinearColor Color){
  const auto Clamp=[X,Y,S](FVector2D P){return FVector2D(FMath::Clamp(P.X,double(X),double(X+S)),FMath::Clamp(P.Y,double(Y),double(Y+S)));};
  for(int i=0;i<96;++i){float A=2*PI*i/96,B=2*PI*(i+1)/96;
   FVector2D P=Clamp(XY(C+FVector2D(FMath::Cos(A),FMath::Sin(A))*R));FVector2D Q=Clamp(XY(C+FVector2D(FMath::Cos(B),FMath::Sin(B))*R));
   DrawLine(P.X,P.Y,Q.X,Q.Y,Color,1.5f);
  }
 };
 Circle(G->ZoneCenter,G->ZoneRadius,FLinearColor(.1f,.65f,1));Circle(G->NextCenter,G->NextRadius,FLinearColor::White);
 if(auto* C=Cast<ALCCharacter>(PlayerOwner->GetViewTarget())){auto P=XY(FVector2D(C->GetActorLocation()));DrawRect(FLinearColor::Yellow,P.X-3,P.Y-3,6,6);
  const FVector D=C->GetActorForwardVector();DrawLine(P.X,P.Y,P.X+D.X*14,P.Y+D.Y*14,FLinearColor::Yellow,2);
 }
 DrawText(TEXT("M - MAP"),FColor::Silver,X+6,Y+S-18);
}
