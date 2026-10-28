#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "LCCharacter.generated.h"
class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;
UCLASS()
class LASTCIRCLE_API ALCCharacter : public ACharacter {
 GENERATED_BODY()
public:
 ALCCharacter();
 virtual void BeginPlay() override;
 virtual void Tick(float Dt) override;
 virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
 virtual float TakeDamage(float Amount, const FDamageEvent& Event, AController* Instigator, AActor* Causer) override;
 virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const override;
 UPROPERTY(Replicated) float Health=100;
 UPROPERTY(ReplicatedUsing=OnRepDead) bool bDead=false;
 UPROPERTY(Replicated) bool bOnPlane=false;
 UPROPERTY(Replicated) int32 FlightSeat=0;
 UPROPERTY(Replicated) bool bParachute=false;
 UPROPERTY(Replicated) bool bAiming=false;
 UPROPERTY(Replicated) bool bSprinting=false;
 UPROPERTY(Replicated) bool bReloading=false;
 UPROPERTY(Replicated) bool bHealing=false;
 UPROPERTY(Replicated) bool bHasRifle=false;
 UPROPERTY(Replicated) bool bHasPistol=false;
 UPROPERTY(Replicated) int32 Weapon=0; // 0 rifle, 1 pistol
 UPROPERTY(Replicated) int32 RifleAmmo=0;
 UPROPERTY(Replicated) int32 RifleReserve=0;
 UPROPERTY(Replicated) int32 PistolAmmo=0;
 UPROPERTY(Replicated) int32 PistolReserve=0;
 UPROPERTY(Replicated) int32 Medkits=0;
 bool IsArmed() const { return Weapon==0?bHasRifle:bHasPistol; }
 int Ammo() const { return Weapon==0?RifleAmmo:PistolAmmo; }
 int Reserve() const { return Weapon==0?RifleReserve:PistolReserve; }
 bool CanAct() const;
 bool TryLoot(int Kind);
 void Eliminate();
 void CancelLocalInput();
 void DropFromPlane();
 void SetBotIntent(bool Aim, bool Sprint);
 UFUNCTION(Server,Reliable) void ServerDrop();
 UFUNCTION(Server,Unreliable) void ServerFire(FVector_NetQuantizeNormal Direction);
 UFUNCTION(Server,Reliable) void ServerReload();
 UFUNCTION(Server,Reliable) void ServerInteract();
 UFUNCTION(Server,Reliable) void ServerHeal();
 UFUNCTION(Server,Reliable) void ServerEquip(int32 Slot);
 UFUNCTION(Server,Reliable) void ServerSetIntent(bool Aim,bool Sprint);
 UFUNCTION(NetMulticast,Unreliable) void MulticastShot(FVector_NetQuantize End);
private:
 UPROPERTY() TObjectPtr<USpringArmComponent> Arm;
 UPROPERTY() TObjectPtr<UCameraComponent> Camera;
 UPROPERTY() TObjectPtr<USceneComponent> Body;
 UPROPERTY() TObjectPtr<UStaticMeshComponent> LeftLeg;
 UPROPERTY() TObjectPtr<UStaticMeshComponent> RightLeg;
 UPROPERTY() TObjectPtr<UStaticMeshComponent> LeftArm;
 UPROPERTY() TObjectPtr<UStaticMeshComponent> RightArm;
 UPROPERTY() TObjectPtr<UStaticMeshComponent> Gun;
 UPROPERTY() TObjectPtr<UStaticMeshComponent> Chute;
 UStaticMeshComponent* Part(FName Name,FVector P,FVector Size,FLinearColor Color);
 UFUNCTION() void OnRepDead();
 FTimerHandle ReloadTimer,HealTimer;
 bool bFireHeld=false,bLocalAim=false,bLocalSprint=false;
 float MotionTime=0,ShotGate=0;
 double NextShot=0;
 void MoveForward(float V);
 void MoveRight(float V);
 void LookYaw(float V);
 void LookPitch(float V);
 void PressJump();
 void FireDown(); void FireUp();
 void AimDown(); void AimUp();
 void SprintDown(); void SprintUp();
 void ToggleCrouch();
 void EquipRifle(); void EquipPistol();
 void RefreshIntent();
};
