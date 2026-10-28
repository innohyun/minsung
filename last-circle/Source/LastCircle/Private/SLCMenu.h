#pragma once
#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
class ALCController;
class ULCSessionSubsystem;
class SEditableTextBox;
class SVerticalBox;
class SLCMenu : public SCompoundWidget {
public:
 SLATE_BEGIN_ARGS(SLCMenu){} SLATE_ARGUMENT(TWeakObjectPtr<ALCController>,Controller) SLATE_END_ARGS()
 void Construct(const FArguments& Args);
 virtual void Tick(const FGeometry& Geometry,const double Now,const float Dt) override;
private:
 TWeakObjectPtr<ALCController> PC;
 TWeakObjectPtr<ULCSessionSubsystem> Sessions;
 TSharedPtr<SEditableTextBox> NameField,PasswordField;
 TSharedPtr<SVerticalBox> Rooms;
 FString Signature;
 EVisibility HomeVisibility()const;
 EVisibility RoomVisibility()const;
 FText LobbyText()const;
 void RebuildRooms();
};
