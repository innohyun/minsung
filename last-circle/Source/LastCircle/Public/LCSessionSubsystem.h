#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Interfaces/OnlineSessionInterface.h"
#include "Interfaces/OnlineIdentityInterface.h"
#include "OnlineSessionSettings.h"
#include "Engine/EngineBaseTypes.h"
#include "LCSessionSubsystem.generated.h"
UCLASS()
class LASTCIRCLE_API ULCSessionSubsystem : public UGameInstanceSubsystem {
 GENERATED_BODY()
public:
 virtual void Initialize(FSubsystemCollectionBase& Collection) override;
 virtual void Deinitialize() override;
 FString RoomName=TEXT("LAST CIRCLE");
 FString RoomPassword;
 FString Status=TEXT("Create a room or find a friend's room.");
 bool bHosting=false,bBusy=false,bLoggedIn=false;
 int ExpectedHumans=1;
 TSharedPtr<FOnlineSessionSearch> Search;
 TArray<FOnlineSessionSearchResult> Results;
 void Login();
 void Host(const FString& Name,const FString& Password);
 void Find();
 void Join(int Index,const FString& Password);
 void Leave(const FString& Message=TEXT("Left room."));
 void SetJoinable(bool Joinable);
 bool IsEOS() const;
 bool IsInRoom() const;
private:
 IOnlineSessionPtr Sessions;
 IOnlineIdentityPtr Identity;
 FDelegateHandle LoginHandle,CreateHandle,FindHandle,JoinHandle,DestroyHandle,NetworkHandle,TravelHandle;
 FString PendingPassword;
 bool bLeaving=false;
 void OnLogin(int32 User,bool Success,const FUniqueNetId& Id,const FString& Error);
 void OnCreate(FName Name,bool Success);
 void OnFind(bool Success);
 void OnJoin(FName Name,EOnJoinSessionCompleteResult::Type Result);
 void OnDestroy(FName Name,bool Success);
 void OnNetworkFailure(UWorld* World,UNetDriver* Driver,ENetworkFailure::Type Type,const FString& Error);
 void OnTravelFailure(UWorld* World,ETravelFailure::Type Type,const FString& Error);
 void FinishLeave();
};
