#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "LCGameMode.generated.h"
class ALCCharacter;
UCLASS()
class LASTCIRCLE_API ALCGameMode : public AGameModeBase {
 GENERATED_BODY()
public:
 ALCGameMode();
 virtual void InitGame(const FString& MapName,const FString& Options,FString& Error) override;
 virtual void BeginPlay() override;
 virtual void Tick(float Dt) override;
 virtual void PreLogin(const FString& Options,const FString& Address,const FUniqueNetIdRepl& Id,FString& Error) override;
 virtual void PostLogin(APlayerController* NewPlayer) override;
 virtual void Logout(AController* Exiting) override;
 virtual void HandleStartingNewPlayer_Implementation(APlayerController* NewPlayer) override;
 void StartFromLobby(APlayerController* Requester);
 void ReturnToLobby(APlayerController* Requester);
 void OnEliminated(ALCCharacter* Character);
private:
 bool bArena=false,bRosterReady=false,bTravelling=false;
 float DamageClock=0,ZoneStartRadius=0,RosterWait=0;
 FVector2D ZoneStartCenter=FVector2D::ZeroVector;
 FTimerHandle RosterTimer;
 void PrepareRoster();
 void AdvanceZone();
 void Recount();
 bool IsHost(APlayerController* P) const;
};
