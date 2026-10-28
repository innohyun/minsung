#include "LCGameMode.h"
#include "Engine/World.h"
#include "GameFramework/DamageType.h"
#include "Engine/GameInstance.h"
#include "LCGameState.h"
#include "LCCharacter.h"
#include "LCBotController.h"
#include "LCController.h"
#include "LCHUD.h"
#include "LCWorld.h"
#include "LCPickup.h"
#include "LCSessionSubsystem.h"
#include "LCRules.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "EngineUtils.h"
#include "TimerManager.h"
#include "GenericPlatform/GenericPlatformHttp.h"
ALCGameMode::ALCGameMode(){
 DefaultPawnClass=ALCCharacter::StaticClass();PlayerControllerClass=ALCController::StaticClass();
 GameStateClass=ALCGameState::StaticClass();PlayerStateClass=ALCPlayerState::StaticClass();HUDClass=ALCHUD::StaticClass();
 PrimaryActorTick.bCanEverTick=true;bUseSeamlessTravel=true;
}
void ALCGameMode::InitGame(const FString& MapName,const FString& Options,FString& Error){
 bArena=MapName.Contains(TEXT("Arena"));Super::InitGame(MapName,Options,Error);
}
void ALCGameMode::BeginPlay(){
 Super::BeginPlay();bArena=GetWorld()->GetMapName().Contains(TEXT("Arena"));
 auto* S=GetGameState<ALCGameState>();auto* Sessions=GetGameInstance()->GetSubsystem<ULCSessionSubsystem>();
 S->RoomName=Sessions->RoomName;
 GetWorld()->SpawnActor<ALCWorld>();
 if(bArena){
  S->Phase=ELCPhase::Loading;S->PhaseEnds=GetWorld()->GetTimeSeconds()+45.f;
  FRandomStream Random(int32(FDateTime::UtcNow().ToUnixTimestamp()));
  for(const FVector& P:ALCWorld::LootLocations()){
   auto* Loot=GetWorld()->SpawnActorDeferred<ALCPickup>(ALCPickup::StaticClass(),FTransform(P));
   Loot->Kind=Random.RandRange(0,3);UGameplayStatics::FinishSpawningActor(Loot,FTransform(P));
  }
  // Seamless travel may finish after BeginPlay; wait for all transferred humans.
  GetWorldTimerManager().SetTimer(RosterTimer,this,&ALCGameMode::PrepareRoster,.2f,true);
 }else{S->Phase=ELCPhase::Lobby;Sessions->SetJoinable(true);}
}
void ALCGameMode::PreLogin(const FString& Options,const FString& Address,const FUniqueNetIdRepl& Id,FString& Error){
 Super::PreLogin(Options,Address,Id,Error);if(!Error.IsEmpty())return;
 auto* Sessions=GetGameInstance()->GetSubsystem<ULCSessionSubsystem>();
 const auto* S=GetGameState<ALCGameState>();
 if(bArena || bTravelling || (S&&S->Phase!=ELCPhase::Lobby)){Error=TEXT("MATCH_IN_PROGRESS");return;}
 if(GetNumPlayers()>=LCRules::Slots){Error=TEXT("ROOM_FULL");return;}
 const FString Supplied=FGenericPlatformHttp::UrlDecode(UGameplayStatics::ParseOption(Options,TEXT("RoomPassword")));
 if(Sessions->bHosting && Supplied!=Sessions->RoomPassword){Error=TEXT("WRONG_PASSWORD");return;}
}
void ALCGameMode::PostLogin(APlayerController* P){Super::PostLogin(P);Recount();}
void ALCGameMode::HandleStartingNewPlayer_Implementation(APlayerController* P){
 Super::HandleStartingNewPlayer_Implementation(P);
 if(auto* C=Cast<ALCCharacter>(P->GetPawn())){
  C->SetActorLocation(FVector(0,0,bArena?12000:200));
  C->bOnPlane=bArena;C->GetCharacterMovement()->DisableMovement();
  if(auto* PS=P->GetPlayerState<ALCPlayerState>())PS->bEliminated=false;
 }
 Recount();
}
bool ALCGameMode::IsHost(APlayerController* P)const{return P && P->IsLocalController();}
void ALCGameMode::StartFromLobby(APlayerController* P){
 auto* S=GetGameState<ALCGameState>();Recount();
 if(!LCRules::CanStart(S->Humans,S->Phase==ELCPhase::Lobby,IsHost(P))||bTravelling)return;
 auto* Sessions=GetGameInstance()->GetSubsystem<ULCSessionSubsystem>();
 Sessions->ExpectedHumans=S->Humans;Sessions->SetJoinable(false);bTravelling=true;
 GetWorld()->ServerTravel(TEXT("/Game/Maps/Arena?listen"));
}
void ALCGameMode::ReturnToLobby(APlayerController* P){
 if(!IsHost(P)||GetGameState<ALCGameState>()->Phase!=ELCPhase::Finished||bTravelling)return;
 bTravelling=true;GetWorld()->ServerTravel(TEXT("/Game/Maps/FrontEnd?listen"));
}
void ALCGameMode::PrepareRoster(){
 if(bRosterReady)return;
 RosterWait+=.2f;
 if(RosterWait>45){
  GetWorldTimerManager().ClearTimer(RosterTimer);
  GetGameInstance()->GetSubsystem<ULCSessionSubsystem>()->Status=TEXT("Player loading timed out. Back in lobby.");
  GetWorld()->ServerTravel(TEXT("/Game/Maps/FrontEnd?listen"));return;
 }
 auto* Sessions=GetGameInstance()->GetSubsystem<ULCSessionSubsystem>();
 int Humans=0;
 for(FConstPlayerControllerIterator It=GetWorld()->GetPlayerControllerIterator();It;++It){
  auto* PC=It->Get();if(!PC || !PC->GetPawn() || !PC->HasClientLoadedCurrentWorld())return;++Humans;
 }
 // Do not start an empty or partially transferred roster.
 if(Humans<FMath::Max(1,Sessions->ExpectedHumans))return;
 int Seat=0;
 for(FConstPlayerControllerIterator It=GetWorld()->GetPlayerControllerIterator();It;++It){
  auto* C=Cast<ALCCharacter>(It->Get()->GetPawn());if(!C)return;
  C->bOnPlane=true;C->FlightSeat=Seat++;C->GetCharacterMovement()->DisableMovement();
  if(auto* PS=C->GetPlayerState<ALCPlayerState>())PS->bEliminated=false;
 }
 for(int i=0;i<LCRules::BotsToFill(Humans);++i){
  auto* AI=GetWorld()->SpawnActor<ALCBotController>();
  FActorSpawnParameters Params;Params.SpawnCollisionHandlingOverride=ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
  auto* C=GetWorld()->SpawnActor<ALCCharacter>(ALCCharacter::StaticClass(),FVector(0,0,12000),FRotator::ZeroRotator,Params);
  AI->Possess(C);if(auto* PS=AI->GetPlayerState<ALCPlayerState>())PS->SetPlayerName(FString::Printf(TEXT("BOT %02d"),i+1));
  C->bOnPlane=true;C->FlightSeat=Seat++;C->GetCharacterMovement()->DisableMovement();
 }
 bRosterReady=true;GetWorldTimerManager().ClearTimer(RosterTimer);
 auto* S=GetGameState<ALCGameState>();S->Phase=ELCPhase::Flight;S->PhaseEnds=GetWorld()->GetTimeSeconds()+LCRules::FlightSeconds;
 Recount();
}
void ALCGameMode::Recount(){
 auto* S=GetGameState<ALCGameState>();if(!S)return;
 S->Humans=GetNumPlayers();S->Alive=0;
 for(TActorIterator<ALCCharacter> It(GetWorld());It;++It)if(!It->bDead)++S->Alive;
}
void ALCGameMode::Logout(AController* Exiting){
 if(auto* C=Cast<ALCCharacter>(Exiting->GetPawn()))if(bArena)C->Eliminate();
 Super::Logout(Exiting);Recount();
 if(bArena&&!bRosterReady){auto* Sessions=GetGameInstance()->GetSubsystem<ULCSessionSubsystem>();Sessions->ExpectedHumans=FMath::Max(1,Sessions->ExpectedHumans-1);}
}
void ALCGameMode::OnEliminated(ALCCharacter* C){
 if(!bRosterReady)return;Recount();auto* S=GetGameState<ALCGameState>();
 if(S->Phase==ELCPhase::Finished || S->Alive>1)return;
 S->Winner=TEXT("NO SURVIVOR");
 for(TActorIterator<ALCCharacter> It(GetWorld());It;++It)if(!It->bDead){
  const auto* PS=It->GetPlayerState();S->Winner=PS?PS->GetPlayerName():TEXT("SURVIVOR");break;
 }
 S->Phase=ELCPhase::Finished;
 for(TActorIterator<ALCCharacter> It(GetWorld());It;++It)It->GetCharacterMovement()->DisableMovement();
}
void ALCGameMode::AdvanceZone(){
 auto* S=GetGameState<ALCGameState>();const float Now=GetWorld()->GetTimeSeconds();
 if(S->bShrinking){
  S->ZoneRadius=S->NextRadius;S->ZoneCenter=S->NextCenter;S->bShrinking=false;
  S->NextRadius=LCRules::ZoneRadius(S->ZoneStage+1);
  const float Offset=FMath::Max(0.f,S->ZoneRadius-S->NextRadius)*.4f;
  const float Angle=FMath::FRand()*2*PI;
  S->NextCenter=S->ZoneCenter+FVector2D(FMath::Cos(Angle),FMath::Sin(Angle))*Offset;
  S->PhaseEnds=Now+LCRules::HoldSeconds;
 }
 else{
  S->ZoneStage=FMath::Min(S->ZoneStage+1,LCRules::ZonePhases);
  ZoneStartRadius=S->ZoneRadius;ZoneStartCenter=S->ZoneCenter;
  S->bShrinking=true;S->PhaseEnds=Now+LCRules::ShrinkSeconds;
 }
}
void ALCGameMode::Tick(float Dt){
 Super::Tick(Dt);if(!bArena||!bRosterReady)return;
 auto* S=GetGameState<ALCGameState>();const float Now=GetWorld()->GetTimeSeconds();
 if(S->Phase==ELCPhase::Flight){
  if(Now>=S->PhaseEnds){for(TActorIterator<ALCCharacter> It(GetWorld());It;++It)It->DropFromPlane();
   S->Phase=ELCPhase::Battle;S->PhaseEnds=Now+LCRules::HoldSeconds;
   S->NextRadius=LCRules::ZoneRadius(1);
  }
 }else if(S->Phase==ELCPhase::Battle){
  if(S->bShrinking){
   const float Elapsed=LCRules::ShrinkSeconds-(S->PhaseEnds-Now);
   S->ZoneRadius=LCRules::LerpRadius(ZoneStartRadius,S->NextRadius,Elapsed);
   S->ZoneCenter=FMath::Lerp(ZoneStartCenter,S->NextCenter,FMath::Clamp(Elapsed/LCRules::ShrinkSeconds,0.f,1.f));
  }
  if(Now>=S->PhaseEnds)AdvanceZone();
  DamageClock+=Dt;if(DamageClock>=1.f){DamageClock-=1.f;
   for(TActorIterator<ALCCharacter> It(GetWorld());It;++It){const FVector P=It->GetActorLocation();
    if(!It->bDead&&LCRules::Outside(P.X,P.Y,S->ZoneCenter.X,S->ZoneCenter.Y,S->ZoneRadius))
     UGameplayStatics::ApplyDamage(*It,LCRules::ZoneDamage(S->ZoneStage),nullptr,this,UDamageType::StaticClass());
   }
  }
 }
}
