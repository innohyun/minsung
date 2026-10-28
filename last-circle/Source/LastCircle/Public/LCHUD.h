#pragma once
#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "LCHUD.generated.h"
UCLASS()
class LASTCIRCLE_API ALCHUD : public AHUD {
 GENERATED_BODY()
public:
 bool bMapOpen=false,bInventoryOpen=false;
 virtual void DrawHUD() override;
private:
 void Map(float X,float Y,float Size);
};
