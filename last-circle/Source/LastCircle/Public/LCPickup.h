#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LCPickup.generated.h"
UCLASS()
class LASTCIRCLE_API ALCPickup : public AActor {
 GENERATED_BODY()
public:
 ALCPickup();
 UPROPERTY(ReplicatedUsing=OnRepKind) int32 Kind=0;
 virtual void BeginPlay() override;
 virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const override;
 static FString Label(int Kind);
private:
 UFUNCTION() void OnRepKind();
 UPROPERTY() TObjectPtr<class UStaticMeshComponent> Mesh;
};
