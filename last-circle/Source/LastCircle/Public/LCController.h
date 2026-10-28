#pragma once
#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "LCController.generated.h"
UCLASS()
class LASTCIRCLE_API ALCController : public APlayerController {
 GENERATED_BODY()
public:
 virtual void BeginPlay() override;
 virtual void ClientRestart_Implementation(APawn* NewPawn) override;
 virtual void Tick(float Dt) override;
 virtual void EndPlay(const EEndPlayReason::Type Reason) override;
 virtual void SetupInputComponent() override;
 UFUNCTION(Server,Reliable) void ServerStartMatch();
 UFUNCTION(Server,Reliable) void ServerReturnToLobby();
 UFUNCTION(Client,Reliable) void ClientEliminated();
 void ShowMenu(bool Show);
private:
 TSharedPtr<class SLCMenu> Menu;
 bool bMenuVisible=false;
 bool bWasRequired=false;
 bool bSpectating=false;
 void ToggleMenu();
 void ToggleMap();
 void ToggleInventory();
 void CycleSpectator();
};
