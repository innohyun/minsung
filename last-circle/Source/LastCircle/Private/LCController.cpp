#include "LCController.h"
#include "Engine/World.h"
#include "Engine/GameInstance.h"
#include "Camera/PlayerCameraManager.h"
#include "Components/InputComponent.h"
#include "LCGameMode.h"
#include "LCGameState.h"
#include "LCCharacter.h"
#include "LCSessionSubsystem.h"
#include "LCHUD.h"
#include "SLCMenu.h"
#include "Engine/GameViewportClient.h"
#include "Engine/Engine.h"
#include "EngineUtils.h"
#include "Widgets/SWeakWidget.h"
#include "Framework/Application/SlateApplication.h"
void ALCController::BeginPlay(){Super::BeginPlay();if(IsLocalController()){PlayerCameraManager->ViewPitchMin=-75;PlayerCameraManager->ViewPitchMax=65;}}
void ALCController::ClientRestart_Implementation(APawn* NewPawn){
 Super::ClientRestart_Implementation(NewPawn);
 bSpectating=false;
 if(NewPawn)SetViewTarget(NewPawn);
 if(auto* H=Cast<ALCHUD>(GetHUD())){H->bMapOpen=false;H->bInventoryOpen=false;}
}
void ALCController::SetupInputComponent(){
 Super::SetupInputComponent();InputComponent->BindAction("Menu",IE_Pressed,this,&ALCController::ToggleMenu);
 InputComponent->BindAction("Map",IE_Pressed,this,&ALCController::ToggleMap);
 InputComponent->BindAction("Inventory",IE_Pressed,this,&ALCController::ToggleInventory);
 InputComponent->BindAction("Spectate",IE_Pressed,this,&ALCController::CycleSpectator);
}
void ALCController::Tick(float Dt){
 Super::Tick(Dt);if(!IsLocalController())return;
 auto* G=GetWorld()->GetGameState<ALCGameState>();if(!G)return;
 const bool Required=G->Phase==ELCPhase::Lobby||G->Phase==ELCPhase::Loading||G->Phase==ELCPhase::Finished;
 if(Required!=bWasRequired){ShowMenu(Required);bWasRequired=Required;}
 if(Required&&!Menu.IsValid())ShowMenu(true);
 if(bSpectating){auto* Viewed=Cast<ALCCharacter>(GetViewTarget());if(!Viewed||Viewed->bDead)CycleSpectator();}
}
void ALCController::EndPlay(const EEndPlayReason::Type Reason){ShowMenu(false);Super::EndPlay(Reason);}
void ALCController::ShowMenu(bool Show){
 if(!IsLocalController()||!GEngine||!GEngine->GameViewport)return;
 bMenuVisible=Show;bShowMouseCursor=Show;
 if(Show){
  if(auto* C=Cast<ALCCharacter>(GetPawn()))C->CancelLocalInput();
  if(!Menu.IsValid()){SAssignNew(Menu,SLCMenu).Controller(this);GEngine->GameViewport->AddViewportWidgetContent(Menu.ToSharedRef(),20);}
  FInputModeUIOnly Mode;Mode.SetWidgetToFocus(Menu);SetInputMode(Mode);
 }else{
  if(Menu.IsValid()){GEngine->GameViewport->RemoveViewportWidgetContent(Menu.ToSharedRef());Menu.Reset();}
  SetInputMode(FInputModeGameOnly());
 }
}
void ALCController::ToggleMenu(){
 auto* G=GetWorld()->GetGameState<ALCGameState>();if(G&&(G->Phase==ELCPhase::Lobby||G->Phase==ELCPhase::Loading||G->Phase==ELCPhase::Finished))return;
 ShowMenu(!bMenuVisible);
}
void ALCController::ToggleMap(){if(auto* H=Cast<ALCHUD>(GetHUD()))H->bMapOpen=!H->bMapOpen;}
void ALCController::ToggleInventory(){if(auto* H=Cast<ALCHUD>(GetHUD()))H->bInventoryOpen=!H->bInventoryOpen;}
void ALCController::ServerStartMatch_Implementation(){if(auto* GM=GetWorld()->GetAuthGameMode<ALCGameMode>())GM->StartFromLobby(this);}
void ALCController::ServerReturnToLobby_Implementation(){if(auto* GM=GetWorld()->GetAuthGameMode<ALCGameMode>())GM->ReturnToLobby(this);}
void ALCController::ClientEliminated_Implementation(){bSpectating=true;CycleSpectator();}
void ALCController::CycleSpectator(){
 auto* Own=Cast<ALCCharacter>(GetPawn());if(!bSpectating&&(!Own||!Own->bDead))return;
 TArray<ALCCharacter*> Alive;for(TActorIterator<ALCCharacter> It(GetWorld());It;++It)if(!It->bDead)Alive.Add(*It);
 if(Alive.IsEmpty())return;
 int Index=Alive.IndexOfByKey(Cast<ALCCharacter>(GetViewTarget()));SetViewTargetWithBlend(Alive[(Index+1)%Alive.Num()],.35f);
}
