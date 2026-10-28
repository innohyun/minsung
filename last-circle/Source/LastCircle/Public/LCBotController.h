#pragma once
#include "CoreMinimal.h"
#include "AIController.h"
#include "LCBotController.generated.h"
UCLASS()
class LASTCIRCLE_API ALCBotController : public AAIController {
 GENERATED_BODY()
public:
 ALCBotController();
 virtual void Tick(float Dt) override;
private:
 float ThinkClock=0,VisibleTime=0,NextDrop=0;
 TWeakObjectPtr<class ALCCharacter> Target;
 FVector Destination=FVector::ZeroVector;
 FVector MovementIntent=FVector::ZeroVector;
 void Think(float Dt);
 void Steer(const FVector& To);
};
