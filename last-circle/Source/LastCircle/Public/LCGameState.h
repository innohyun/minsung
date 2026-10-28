#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "GameFramework/PlayerState.h"
#include "LCGameState.generated.h"
UENUM()
enum class ELCPhase : uint8 { Lobby, Loading, Flight, Battle, Finished };
UCLASS()
class LASTCIRCLE_API ALCPlayerState : public APlayerState {
 GENERATED_BODY()
public:
 ALCPlayerState();
 UPROPERTY(Replicated) bool bEliminated = false;
 virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const override;
};
UCLASS()
class LASTCIRCLE_API ALCGameState : public AGameStateBase {
 GENERATED_BODY()
public:
 UPROPERTY(Replicated) ELCPhase Phase = ELCPhase::Lobby;
 UPROPERTY(Replicated) int32 Alive = 0;
 UPROPERTY(Replicated) int32 Humans = 0;
 UPROPERTY(Replicated) FString RoomName;
 UPROPERTY(Replicated) FString Winner;
 UPROPERTY(Replicated) float PhaseEnds = 0;
 UPROPERTY(Replicated) int32 ZoneStage = 0;
 UPROPERTY(Replicated) FVector2D ZoneCenter = FVector2D::ZeroVector;
 UPROPERTY(Replicated) FVector2D NextCenter = FVector2D::ZeroVector;
 UPROPERTY(Replicated) float ZoneRadius = 19000.f;
 UPROPERTY(Replicated) float NextRadius = 19000.f;
 UPROPERTY(Replicated) bool bShrinking = false;
 virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const override;
};
