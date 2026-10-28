#include "LCSessionSubsystem.h"
#include "Engine/World.h"
#include "OnlineSubsystem.h"
#include "OnlineSessionSettings.h"
#include "Engine/Engine.h"
#include "Engine/GameInstance.h"
#include "Engine/LocalPlayer.h"
#include "Kismet/GameplayStatics.h"
#include "GenericPlatform/GenericPlatformHttp.h"
namespace {const FName RoomKey(TEXT("LC_ROOM"));const FName LockedKey(TEXT("LC_LOCKED"));const FName ProtocolKey(TEXT("LC_PROTOCOL"));}
void ULCSessionSubsystem::Initialize(FSubsystemCollectionBase& C){
 Super::Initialize(C);
 if(auto* OSS=IOnlineSubsystem::Get()){Sessions=OSS->GetSessionInterface();Identity=OSS->GetIdentityInterface();}
 if(Sessions.IsValid()){
  CreateHandle=Sessions->AddOnCreateSessionCompleteDelegate_Handle(FOnCreateSessionCompleteDelegate::CreateUObject(this,&ULCSessionSubsystem::OnCreate));
  FindHandle=Sessions->AddOnFindSessionsCompleteDelegate_Handle(FOnFindSessionsCompleteDelegate::CreateUObject(this,&ULCSessionSubsystem::OnFind));
  JoinHandle=Sessions->AddOnJoinSessionCompleteDelegate_Handle(FOnJoinSessionCompleteDelegate::CreateUObject(this,&ULCSessionSubsystem::OnJoin));
  DestroyHandle=Sessions->AddOnDestroySessionCompleteDelegate_Handle(FOnDestroySessionCompleteDelegate::CreateUObject(this,&ULCSessionSubsystem::OnDestroy));
 }
 if(Identity.IsValid())LoginHandle=Identity->AddOnLoginCompleteDelegate_Handle(0,FOnLoginCompleteDelegate::CreateUObject(this,&ULCSessionSubsystem::OnLogin));
 if(GEngine){NetworkHandle=GEngine->OnNetworkFailure().AddUObject(this,&ULCSessionSubsystem::OnNetworkFailure);TravelHandle=GEngine->OnTravelFailure().AddUObject(this,&ULCSessionSubsystem::OnTravelFailure);}
 bLoggedIn=!IsEOS();
}
void ULCSessionSubsystem::Deinitialize(){
 if(Sessions.IsValid()){
  Sessions->ClearOnCreateSessionCompleteDelegate_Handle(CreateHandle);Sessions->ClearOnFindSessionsCompleteDelegate_Handle(FindHandle);
  Sessions->ClearOnJoinSessionCompleteDelegate_Handle(JoinHandle);Sessions->ClearOnDestroySessionCompleteDelegate_Handle(DestroyHandle);
 }
 if(Identity.IsValid())Identity->ClearOnLoginCompleteDelegate_Handle(0,LoginHandle);
 if(GEngine){GEngine->OnNetworkFailure().Remove(NetworkHandle);GEngine->OnTravelFailure().Remove(TravelHandle);}
 Super::Deinitialize();
}
bool ULCSessionSubsystem::IsEOS()const{auto* OSS=IOnlineSubsystem::Get();return OSS&&OSS->GetSubsystemName()==FName(TEXT("EOS"));}
bool ULCSessionSubsystem::IsInRoom()const{return Sessions.IsValid()&&Sessions->GetNamedSession(NAME_GameSession)!=nullptr;}
void ULCSessionSubsystem::Login(){
 if(bBusy)return;
 if(!IsEOS()){bLoggedIn=true;Status=TEXT("LAN ready. Internet rooms require EOS configuration.");return;}
 if(!Identity.IsValid()){Status=TEXT("Online identity unavailable.");return;}
 if(Identity->GetLoginStatus(0)==ELoginStatus::LoggedIn){bLoggedIn=true;Status=TEXT("Signed in.");return;}
 bBusy=true;Status=TEXT("Complete Epic sign-in in the browser...");
 if(!Identity->Login(0,FOnlineAccountCredentials(TEXT("accountportal"),TEXT(""),TEXT("")))){bBusy=false;Status=TEXT("Could not begin Epic sign-in. Check EOS configuration.");}
}
void ULCSessionSubsystem::OnLogin(int32 User,bool Success,const FUniqueNetId& Id,const FString& Error){bBusy=false;bLoggedIn=Success;Status=Success?TEXT("Signed in. You can create or find a room."):TEXT("Epic sign-in failed. Check configuration and account access.");}
void ULCSessionSubsystem::Host(const FString& Name,const FString& Password){
 if(bBusy)return;
 if(!Sessions.IsValid()){Status=TEXT("Session service unavailable.");return;}
 if(IsInRoom()){Status=TEXT("Leave the current room first.");return;}
 if(!bLoggedIn){Status=TEXT("Sign in before creating an internet room.");return;}
 RoomName=Name.TrimStartAndEnd().Left(32);if(RoomName.IsEmpty())RoomName=TEXT("LAST CIRCLE");
 if(Password.Len()>24){Status=TEXT("Password: maximum 24 characters.");return;}
 RoomPassword=Password;
 FOnlineSessionSettings Settings;Settings.bIsLANMatch=!IsEOS();Settings.NumPublicConnections=10;
 Settings.bShouldAdvertise=true;Settings.bAllowJoinInProgress=true;Settings.bAllowJoinViaPresence=false;
 Settings.bUsesPresence=false;Settings.bUseLobbiesIfAvailable=false;Settings.BuildUniqueId=1;
 Settings.Set(RoomKey,RoomName,EOnlineDataAdvertisementType::ViaOnlineServiceAndPing);
 Settings.Set(LockedKey,!Password.IsEmpty(),EOnlineDataAdvertisementType::ViaOnlineServiceAndPing);
 Settings.Set(ProtocolKey,1,EOnlineDataAdvertisementType::ViaOnlineServiceAndPing);
 bBusy=true;Status=TEXT("Creating room...");
 if(!Sessions->CreateSession(0,NAME_GameSession,Settings)){bBusy=false;Status=TEXT("Could not create room.");}
}
void ULCSessionSubsystem::OnCreate(FName Name,bool Success){
 bBusy=false;if(!Success){Status=TEXT("Room creation failed.");return;}
 bHosting=true;ExpectedHumans=1;Status=TEXT("Room created. Invite friends, then start when ready.");
 UGameplayStatics::OpenLevel(GetWorld(),TEXT("/Game/Maps/FrontEnd"),true,TEXT("listen"));
}
void ULCSessionSubsystem::Find(){
 if(bBusy)return;
 if(!Sessions.IsValid()||!bLoggedIn){Status=TEXT("Sign in first, or check session service.");return;}
 if(IsInRoom()){Status=TEXT("Leave the room before searching.");return;}
 Search=MakeShared<FOnlineSessionSearch>();Search->bIsLanQuery=!IsEOS();Search->MaxSearchResults=100;
 if(IsEOS())Search->QuerySettings.Set(ProtocolKey,1,EOnlineComparisonOp::Equals);
 bBusy=true;Results.Reset();Status=TEXT("Finding rooms...");
 if(!Sessions->FindSessions(0,Search.ToSharedRef())){bBusy=false;Status=TEXT("Room search could not start.");}
}
void ULCSessionSubsystem::OnFind(bool Success){
 bBusy=false;Results.Reset();if(Success&&Search.IsValid())for(const auto& R:Search->SearchResults){
  int Protocol=0;R.Session.SessionSettings.Get(ProtocolKey,Protocol);
  if(Protocol==1&&R.Session.NumOpenPublicConnections>0&&R.Session.SessionSettings.bAllowJoinInProgress)Results.Add(R);
 }
 Status=Success?FString::Printf(TEXT("%d room(s) found. Refresh if your friend's room is missing."),Results.Num()):TEXT("Room search failed.");
}
void ULCSessionSubsystem::Join(int Index,const FString& Password){
 if(bBusy||!Sessions.IsValid()||!Results.IsValidIndex(Index)||IsInRoom())return;
 if(Password.Len()>24){Status=TEXT("Password: maximum 24 characters.");return;}
 PendingPassword=Password;bBusy=true;Status=TEXT("Joining room...");
 if(!Sessions->JoinSession(0,NAME_GameSession,Results[Index])){bBusy=false;Status=TEXT("Could not join room.");}
}
void ULCSessionSubsystem::OnJoin(FName Name,EOnJoinSessionCompleteResult::Type Result){
 bBusy=false;FString Address;
 if(Result!=EOnJoinSessionCompleteResult::Success||!Sessions->GetResolvedConnectString(Name,Address)){
  Status=TEXT("Join failed: room full, closed, or no longer available.");
  if(IsInRoom())Leave(Status);return;
 }
 bHosting=false;
 Address+=TEXT("?RoomPassword=")+FGenericPlatformHttp::UrlEncode(PendingPassword);PendingPassword.Empty();
 if(auto* PC=GetGameInstance()->GetFirstLocalPlayerController())PC->ClientTravel(Address,TRAVEL_Absolute);
}
void ULCSessionSubsystem::SetJoinable(bool Joinable){
 if(!bHosting||!Sessions.IsValid())return;
 if(auto* Named=Sessions->GetNamedSession(NAME_GameSession)){
  FOnlineSessionSettings Updated=Named->SessionSettings;Updated.bAllowJoinInProgress=Joinable;Updated.bShouldAdvertise=Joinable;
  Sessions->UpdateSession(NAME_GameSession,Updated,true);
 }
}
void ULCSessionSubsystem::Leave(const FString& Message){
 if(bLeaving)return;bLeaving=true;bBusy=true;Status=Message;
 bHosting=false;RoomPassword.Empty();PendingPassword.Empty();
 if(!Sessions.IsValid()||!IsInRoom()||!Sessions->DestroySession(NAME_GameSession))FinishLeave();
}
void ULCSessionSubsystem::OnDestroy(FName Name,bool Success){if(bLeaving)FinishLeave();}
void ULCSessionSubsystem::FinishLeave(){
 bBusy=false;bLeaving=false;ExpectedHumans=1;
 UGameplayStatics::OpenLevel(GetWorld(),TEXT("/Game/Maps/FrontEnd"));
}
void ULCSessionSubsystem::OnNetworkFailure(UWorld* World,UNetDriver* Driver,ENetworkFailure::Type Type,const FString& Error){
 if(World==GetWorld())Leave(TEXT("Connection lost or rejected (host left, password, capacity, or network)."));
}
void ULCSessionSubsystem::OnTravelFailure(UWorld* World,ETravelFailure::Type Type,const FString& Error){
 if(World==GetWorld())Leave(TEXT("Map travel failed. Check that maps were generated and packaged."));
}
