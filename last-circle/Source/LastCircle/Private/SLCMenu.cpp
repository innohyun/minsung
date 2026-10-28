#include "SLCMenu.h"
#include "Styling/CoreStyle.h"
#include "Engine/World.h"
#include "Engine/GameInstance.h"
#include "LCController.h"
#include "LCSessionSubsystem.h"
#include "LCGameState.h"
#include "LCRules.h"
#include "OnlineSessionSettings.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Input/SButton.h"
#include "GameFramework/GameUserSettings.h"
#include "Engine/Engine.h"
void SLCMenu::Construct(const FArguments& Args){
 PC=Args._Controller;Sessions=PC->GetGameInstance()->GetSubsystem<ULCSessionSubsystem>();
 const auto Text=[](const TCHAR* S){return FText::FromString(S);};
 ChildSlot[
  SNew(SBorder).BorderBackgroundColor(FLinearColor(.015f,.025f,.04f,.96f)).Padding(32)
  [SNew(SBox).WidthOverride(650).HAlign(HAlign_Center).VAlign(VAlign_Center)
   [SNew(SScrollBox)
    +SScrollBox::Slot()[SNew(SVerticalBox)
     +SVerticalBox::Slot().AutoHeight().Padding(0,0,0,8)[SNew(STextBlock).Text(Text(TEXT("LAST CIRCLE"))).Font(FCoreStyle::GetDefaultFontStyle("Bold",32))]
     +SVerticalBox::Slot().AutoHeight().Padding(0,0,0,20)[SNew(STextBlock).Text(Text(TEXT("10 SLOTS  /  ONE SURVIVOR")))]
     +SVerticalBox::Slot().AutoHeight().Padding(0,6)[SNew(STextBlock).AutoWrapText(true).Text_Lambda([this]{return FText::FromString(Sessions.IsValid()?Sessions->Status:TEXT("Session unavailable"));})]
     +SVerticalBox::Slot().AutoHeight().Padding(0,4)[SNew(SVerticalBox).Visibility(this,&SLCMenu::HomeVisibility)
      +SVerticalBox::Slot().AutoHeight().Padding(0,4)[SNew(STextBlock).Text_Lambda([this]{return FText::FromString(Sessions->IsEOS()?TEXT("INTERNET / EOS"):TEXT("LAN MODE / same network only"));})]
      +SVerticalBox::Slot().AutoHeight().Padding(0,4)[SNew(SButton).Text(Text(TEXT("Sign in / Check connection"))).IsEnabled_Lambda([this]{return !Sessions->bBusy;}).OnClicked_Lambda([this]{Sessions->Login();return FReply::Handled();})]
      +SVerticalBox::Slot().AutoHeight().Padding(0,4)[SAssignNew(NameField,SEditableTextBox).HintText(Text(TEXT("Room name (up to 32 characters)"))).Text(Text(TEXT("My room")))]
      +SVerticalBox::Slot().AutoHeight().Padding(0,4)[SAssignNew(PasswordField,SEditableTextBox).HintText(Text(TEXT("Room password (optional, up to 24 characters)"))).IsPassword(true)]
      +SVerticalBox::Slot().AutoHeight().Padding(0,4)[SNew(SButton).Text(Text(TEXT("CREATE ROOM"))).IsEnabled_Lambda([this]{return !Sessions->bBusy;}).OnClicked_Lambda([this]{Sessions->Host(NameField->GetText().ToString(),PasswordField->GetText().ToString());return FReply::Handled();})]
      +SVerticalBox::Slot().AutoHeight().Padding(0,4)[SNew(SButton).Text(Text(TEXT("FIND / REFRESH ROOMS"))).IsEnabled_Lambda([this]{return !Sessions->bBusy;}).OnClicked_Lambda([this]{Sessions->Find();return FReply::Handled();})]
      +SVerticalBox::Slot().AutoHeight().Padding(0,8)[SAssignNew(Rooms,SVerticalBox)]
     ]
     +SVerticalBox::Slot().AutoHeight().Padding(0,8)[SNew(SVerticalBox).Visibility(this,&SLCMenu::RoomVisibility)
      +SVerticalBox::Slot().AutoHeight().Padding(0,8)[SNew(STextBlock).AutoWrapText(true).Text(this,&SLCMenu::LobbyText)]
      +SVerticalBox::Slot().AutoHeight().Padding(0,8)[SNew(SButton).Text(Text(TEXT("START / FILL EMPTY SLOTS WITH AI"))).Visibility_Lambda([this]{auto* G=PC->GetWorld()->GetGameState<ALCGameState>();return Sessions->bHosting&&G&&G->Phase==ELCPhase::Lobby?EVisibility::Visible:EVisibility::Collapsed;}).OnClicked_Lambda([this]{PC->ServerStartMatch();return FReply::Handled();})]
      +SVerticalBox::Slot().AutoHeight().Padding(0,8)[SNew(SButton).Text(Text(TEXT("RETURN EVERYONE TO LOBBY"))).Visibility_Lambda([this]{auto* G=PC->GetWorld()->GetGameState<ALCGameState>();return Sessions->bHosting&&G&&G->Phase==ELCPhase::Finished?EVisibility::Visible:EVisibility::Collapsed;}).OnClicked_Lambda([this]{PC->ServerReturnToLobby();return FReply::Handled();})]
      +SVerticalBox::Slot().AutoHeight().Padding(0,8)[SNew(SButton).Text(Text(TEXT("LEAVE ROOM"))).OnClicked_Lambda([this]{Sessions->Leave();return FReply::Handled();})]
     ]
     +SVerticalBox::Slot().AutoHeight().Padding(0,8)[SNew(SButton).Text(Text(TEXT("RESUME GAME"))).Visibility_Lambda([this]{auto* G=PC->GetWorld()->GetGameState<ALCGameState>();return G&&(G->Phase==ELCPhase::Flight||G->Phase==ELCPhase::Battle)?EVisibility::Visible:EVisibility::Collapsed;}).OnClicked_Lambda([this]{PC->ShowMenu(false);return FReply::Handled();})]
     +SVerticalBox::Slot().AutoHeight().Padding(0,8)[SNew(STextBlock).AutoWrapText(true).Text(Text(TEXT("WASD move | Mouse aim | LMB fire | RMB aim | Shift sprint | C crouch\nSpace jump/drop | F loot | R reload | H heal | 1/2 weapons\nTab inventory | M map | V next spectator | Esc menu")))]
     +SVerticalBox::Slot().AutoHeight().Padding(0,6)[SNew(SHorizontalBox)
      +SHorizontalBox::Slot().FillWidth(1)[SNew(SButton).Text(Text(TEXT("LOW"))).OnClicked_Lambda([]{GEngine->GetGameUserSettings()->SetOverallScalabilityLevel(0);GEngine->GetGameUserSettings()->SetFrameRateLimit(60);GEngine->GetGameUserSettings()->ApplySettings(false);return FReply::Handled();})]
      +SHorizontalBox::Slot().FillWidth(1)[SNew(SButton).Text(Text(TEXT("MEDIUM / 60 FPS TARGET"))).OnClicked_Lambda([]{GEngine->GetGameUserSettings()->SetOverallScalabilityLevel(1);GEngine->GetGameUserSettings()->SetFrameRateLimit(60);GEngine->GetGameUserSettings()->ApplySettings(false);return FReply::Handled();})]
     ]
     +SVerticalBox::Slot().AutoHeight().Padding(0,12)[SNew(SButton).Text(Text(TEXT("QUIT GAME"))).OnClicked_Lambda([this]{PC->ConsoleCommand(TEXT("quit"));return FReply::Handled();})]
    ]]
   ]
 ];
}
EVisibility SLCMenu::HomeVisibility()const{return Sessions.IsValid()&&!Sessions->IsInRoom()?EVisibility::Visible:EVisibility::Collapsed;}
EVisibility SLCMenu::RoomVisibility()const{return Sessions.IsValid()&&Sessions->IsInRoom()?EVisibility::Visible:EVisibility::Collapsed;}
FText SLCMenu::LobbyText()const{
 const auto* G=PC->GetWorld()->GetGameState<ALCGameState>();if(!G)return FText::FromString(TEXT("Loading room..."));
 FString S=G->RoomName+FString::Printf(TEXT("\n%d humans + %d AI on start / 10 slots\n"),G->Humans,LCRules::BotsToFill(G->Humans));
 if(G->Phase==ELCPhase::Finished)S+=TEXT("\nWINNER: ")+G->Winner+TEXT("\n");
 for(const APlayerState* P:G->PlayerArray)if(P&&!P->IsABot())S+=P->GetPlayerName()+TEXT("\n");
 if(G->Phase==ELCPhase::Loading)S+=TEXT("\nLoading players... (45-second timeout)");
 else if(!Sessions->bHosting&&(G->Phase==ELCPhase::Lobby||G->Phase==ELCPhase::Finished))S+=TEXT("\nWaiting for the host.");
 return FText::FromString(S);
}
void SLCMenu::Tick(const FGeometry& G,const double Now,const float Dt){
 SCompoundWidget::Tick(G,Now,Dt);if(!Sessions.IsValid())return;
 FString New=Sessions->Status+FString::FromInt(Sessions->Results.Num());
 for(const auto& R:Sessions->Results)New+=R.GetSessionIdStr();
 if(New!=Signature){Signature=New;RebuildRooms();}
}
void SLCMenu::RebuildRooms(){
 if(!Rooms.IsValid())return;Rooms->ClearChildren();
 for(int i=0;i<Sessions->Results.Num();++i){
  const auto& R=Sessions->Results[i];FString Name;bool Locked=false;
  R.Session.SessionSettings.Get(FName(TEXT("LC_ROOM")),Name);R.Session.SessionSettings.Get(FName(TEXT("LC_LOCKED")),Locked);
  FString Label=FString::Printf(TEXT("%s  %d/10  %s  %d ms  [JOIN]"),*Name,10-R.Session.NumOpenPublicConnections,Locked?TEXT("LOCKED"):TEXT("OPEN"),R.PingInMs);
  Rooms->AddSlot().AutoHeight().Padding(0,4)[SNew(SButton).Text(FText::FromString(Label)).IsEnabled_Lambda([this]{return !Sessions->bBusy;}).OnClicked_Lambda([this,i]{Sessions->Join(i,PasswordField->GetText().ToString());return FReply::Handled();})];
 }
}
