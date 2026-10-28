#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LCWorld.generated.h"
class UStaticMeshComponent;
UCLASS()
class LASTCIRCLE_API ALCWorld : public AActor {
 GENERATED_BODY()
public:
 ALCWorld();
 virtual void BeginPlay() override;
 virtual void Tick(float DeltaSeconds) override;
 static const TArray<FVector>& LootLocations();
private:
 UStaticMeshComponent* Box(FVector Position, FVector Size, FLinearColor Color, bool Collision = true);
 UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Ring;
 UPROPERTY() TObjectPtr<UStaticMeshComponent> Plane;
};
