#include "LCCharacter.h"
#include "Engine/World.h"
#include "GameFramework/DamageType.h"
#include "UObject/ConstructorHelpers.h"
#include "Engine/StaticMesh.h"
#include "LCGameState.h"
#include "LCGameMode.h"
#include "LCController.h"
#include "LCPickup.h"
#include "LCRules.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Net/UnrealNetwork.h"
#include "Kismet/GameplayStatics.h"
#include "DrawDebugHelpers.h"
#include "EngineUtils.h"
#include "TimerManager.h"
ALCCharacter::ALCCharacter() {
 PrimaryActorTick.bCanEverTick=true; bReplicates=true; NetUpdateFrequency=45;
 GetCapsuleComponent()->InitCapsuleSize(36,88);
 GetCapsuleComponent()->SetCollisionResponseToChannel(ECC_Visibility,ECR_Block);
 bUseControllerRotationYaw=false;
 auto* M=GetCharacterMovement(); M->bOrientRotationToMovement=true;
 M->RotationRate=FRotator(0,540,0); M->MaxWalkSpeed=420; M->JumpZVelocity=460;
 M->GetNavAgentPropertiesRef().bCanCrouch=true;
 M->NetworkSmoothingMode=ENetworkSmoothingMode::Exponential;
 M->MaxSimulationTimeStep=0.033f; M->AirControl=.65f;
 Arm=CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraArm")); Arm->SetupAttachment(RootComponent);
 Arm->TargetArmLength=320; Arm->SocketOffset=FVector(0,65,60); Arm->bUsePawnControlRotation=true;
 Arm->bEnableCameraLag=true; Arm->CameraLagSpeed=14;
 Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("Camera")); Camera->SetupAttachment(Arm);
 Body=CreateDefaultSubobject<USceneComponent>(TEXT("PrototypeBody")); Body->SetupAttachment(RootComponent);
 Body->SetRelativeLocation(FVector(0,0,-88));
 Part(TEXT("Torso"),FVector(0,0,120),FVector(35,52,65),FLinearColor(.09f,.2f,.27f));
 Part(TEXT("Head"),FVector(0,0,165),FVector(29,29,29),FLinearColor(.55f,.43f,.3f));
 LeftLeg=Part(TEXT("LeftLeg"),FVector(0,-15,45),FVector(23,22,80),FLinearColor(.12f,.14f,.17f));
 RightLeg=Part(TEXT("RightLeg"),FVector(0,15,45),FVector(23,22,80),FLinearColor(.12f,.14f,.17f));
 LeftArm=Part(TEXT("LeftArm"),FVector(5,-35,120),FVector(20,18,65),FLinearColor(.16f,.26f,.3f));
 RightArm=Part(TEXT("RightArm"),FVector(5,35,120),FVector(20,18,65),FLinearColor(.16f,.26f,.3f));
 Gun=Part(TEXT("Weapon"),FVector(44,25,126),FVector(75,8,12),FLinearColor(.06f,.07f,.08f));
 Chute=Part(TEXT("Parachute"),FVector(0,0,320),FVector(240,340,22),FLinearColor(.7f,.46f,.13f));
}
UStaticMeshComponent* ALCCharacter::Part(FName Name,FVector P,FVector S,FLinearColor C) {
 auto* M=CreateDefaultSubobject<UStaticMeshComponent>(Name); M->SetupAttachment(Body);
 static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
 M->SetStaticMesh(Cube.Object);
 M->SetCollisionEnabled(ECollisionEnabled::NoCollision); M->SetRelativeLocation(P); M->SetRelativeScale3D(S/100);
 M->ComponentTags.Add(FName(*FString::Printf(TEXT("%f,%f,%f"),C.R,C.G,C.B)));
 return M;
}
void ALCCharacter::BeginPlay() {
 Super::BeginPlay();
 TArray<UStaticMeshComponent*> Meshes; GetComponents(Meshes);
 for(auto* M:Meshes) if(auto* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Materials/M_Prototype.M_Prototype"))) {
  auto* Mat=UMaterialInstanceDynamic::Create(Base,this);
  if(M->ComponentTags.Num()) { TArray<FString> RGB; M->ComponentTags[0].ToString().ParseIntoArray(RGB,TEXT(","));
   if(RGB.Num()==3) Mat->SetVectorParameterValue(TEXT("Color"),FLinearColor(FCString::Atof(*RGB[0]),FCString::Atof(*RGB[1]),FCString::Atof(*RGB[2]))); }
  M->SetMaterial(0,Mat);
 }
}
bool ALCCharacter::CanAct() const {
 const auto* G=GetWorld()->GetGameState<ALCGameState>();
 return G && (G->Phase==ELCPhase::Flight || G->Phase==ELCPhase::Battle) && !bDead && !bOnPlane;
}
void ALCCharacter::Tick(float Dt) {
 Super::Tick(Dt);
 if(bOnPlane){
  const auto* G=GetWorld()->GetGameState<ALCGameState>();
  if(G&&G->Phase==ELCPhase::Flight){
   const float X=(1.f-(G->PhaseEnds-G->GetServerWorldTimeSeconds())/LCRules::FlightSeconds)*28000.f-14000;
   SetActorLocation(FVector(X,(FlightSeat%5-2)*100,12000));
  }
 }
 const bool Falling=GetCharacterMovement()->IsFalling();
 if(HasAuthority() && !bOnPlane && !bDead) {
  FHitResult Ground; FCollisionQueryParams Q; Q.AddIgnoredActor(this);
  GetWorld()->LineTraceSingleByChannel(Ground,GetActorLocation(),GetActorLocation()-FVector(0,0,5000),ECC_Visibility,Q);
  bParachute=Falling && Ground.bBlockingHit && Ground.Distance>400 && Ground.Distance<4000;
  GetCharacterMovement()->GravityScale=bParachute?.12f:1.f;
  if(bParachute && GetCharacterMovement()->Velocity.Z < -500) GetCharacterMovement()->Velocity.Z=-500;
 }
 auto* M=GetCharacterMovement();
 M->MaxWalkSpeed=bAiming?240:(bSprinting?650:420);
 M->bOrientRotationToMovement=!bAiming; bUseControllerRotationYaw=bAiming;
 M->GravityScale=bParachute?.12f:1.f;
 const float Speed=GetVelocity().Size2D(); MotionTime+=Dt*FMath::Clamp(Speed/75,0.f,9.f);
 const float Swing=FMath::Sin(MotionTime)*FMath::Clamp(Speed/12,0.f,32.f);
 LeftLeg->SetRelativeRotation(FRotator(Falling?-20:Swing,0,0));
 RightLeg->SetRelativeRotation(FRotator(Falling?20:-Swing,0,0));
 LeftArm->SetRelativeRotation(FRotator(bAiming?-70:-Swing*.6f,0,0));
 RightArm->SetRelativeRotation(FRotator(IsArmed()?-65:Swing*.6f,0,0));
 Body->SetRelativeLocation(FVector(0,0,bIsCrouched?-60:-88));
 Body->SetRelativeRotation(FRotator(bDead?85:0,0,0));
 Chute->SetVisibility(bParachute && !bDead); Gun->SetVisibility(IsArmed() && !bDead);
 Arm->TargetArmLength=FMath::FInterpTo(Arm->TargetArmLength,bAiming?180.f:320.f,Dt,12);
 Camera->SetFieldOfView(FMath::FInterpTo(Camera->FieldOfView,bAiming?65.f:85.f,Dt,12));
 if(IsLocallyControlled() && bFireHeld && CanAct() && IsArmed()) {
  ShotGate-=Dt;
  if(ShotGate<=0) {
   FVector O;FRotator R;Controller->GetPlayerViewPoint(O,R);
   FHitResult H;FCollisionQueryParams Q;Q.AddIgnoredActor(this);
   GetWorld()->LineTraceSingleByChannel(H,O,O+R.Vector()*25000,ECC_Visibility,Q);
   const FVector End=H.bBlockingHit?H.ImpactPoint:O+R.Vector()*25000;
   ServerFire((End-GetPawnViewLocation()).GetSafeNormal()); ShotGate=Weapon==0?.12f:.32f;
   if(Weapon==1)bFireHeld=false;
  }
 }
}
void ALCCharacter::MoveForward(float V) { if(CanAct() && Controller) AddMovementInput(FRotationMatrix(FRotator(0,Controller->GetControlRotation().Yaw,0)).GetUnitAxis(EAxis::X),V); }
void ALCCharacter::MoveRight(float V) { if(CanAct() && Controller) AddMovementInput(FRotationMatrix(FRotator(0,Controller->GetControlRotation().Yaw,0)).GetUnitAxis(EAxis::Y),V); }
void ALCCharacter::LookYaw(float V) { AddControllerYawInput(V); }
void ALCCharacter::LookPitch(float V) { AddControllerPitchInput(V); }
void ALCCharacter::PressJump() { if(bOnPlane)ServerDrop();else if(CanAct()&&!bParachute)Jump(); }
void ALCCharacter::CancelLocalInput(){bFireHeld=false;bLocalAim=false;bLocalSprint=false;RefreshIntent();}
void ALCCharacter::OnRepDead(){if(bDead){bFireHeld=false;GetCharacterMovement()->DisableMovement();GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::NoCollision);}}
void ALCCharacter::FireDown(){bFireHeld=true;ShotGate=0;} void ALCCharacter::FireUp(){bFireHeld=false;}
void ALCCharacter::RefreshIntent(){ServerSetIntent(bLocalAim,bLocalSprint);}
void ALCCharacter::AimDown(){bLocalAim=true;RefreshIntent();} void ALCCharacter::AimUp(){bLocalAim=false;RefreshIntent();}
void ALCCharacter::SprintDown(){bLocalSprint=true;RefreshIntent();} void ALCCharacter::SprintUp(){bLocalSprint=false;RefreshIntent();}
void ALCCharacter::ToggleCrouch(){if(CanAct()){if(bIsCrouched)UnCrouch();else Crouch();}}
void ALCCharacter::EquipRifle(){ServerEquip(0);} void ALCCharacter::EquipPistol(){ServerEquip(1);}
void ALCCharacter::SetupPlayerInputComponent(UInputComponent* I) {
 Super::SetupPlayerInputComponent(I);
 I->BindAxis("Forward",this,&ALCCharacter::MoveForward);I->BindAxis("Right",this,&ALCCharacter::MoveRight);
 I->BindAxis("Yaw",this,&ALCCharacter::LookYaw);I->BindAxis("Pitch",this,&ALCCharacter::LookPitch);
 I->BindAction("Jump",IE_Pressed,this,&ALCCharacter::PressJump);I->BindAction("Jump",IE_Released,this,&ACharacter::StopJumping);
 I->BindAction("Fire",IE_Pressed,this,&ALCCharacter::FireDown);I->BindAction("Fire",IE_Released,this,&ALCCharacter::FireUp);
 I->BindAction("Aim",IE_Pressed,this,&ALCCharacter::AimDown);I->BindAction("Aim",IE_Released,this,&ALCCharacter::AimUp);
 I->BindAction("Sprint",IE_Pressed,this,&ALCCharacter::SprintDown);I->BindAction("Sprint",IE_Released,this,&ALCCharacter::SprintUp);
 I->BindAction("Crouch",IE_Pressed,this,&ALCCharacter::ToggleCrouch);
 I->BindAction("Reload",IE_Pressed,this,&ALCCharacter::ServerReload);I->BindAction("Interact",IE_Pressed,this,&ALCCharacter::ServerInteract);
 I->BindAction("Heal",IE_Pressed,this,&ALCCharacter::ServerHeal);
 I->BindAction("Rifle",IE_Pressed,this,&ALCCharacter::EquipRifle);I->BindAction("Pistol",IE_Pressed,this,&ALCCharacter::EquipPistol);
}
void ALCCharacter::ServerSetIntent_Implementation(bool Aim,bool Sprint){if(!bDead){bAiming=Aim;bSprinting=Sprint&&!Aim;}}
void ALCCharacter::SetBotIntent(bool Aim,bool Sprint){if(HasAuthority())ServerSetIntent_Implementation(Aim,Sprint);}
void ALCCharacter::ServerEquip_Implementation(int32 Slot) {
 if(!CanAct() || bReloading || bHealing || (Slot!=0&&Slot!=1))return;
 if((Slot==0&&bHasRifle)||(Slot==1&&bHasPistol))Weapon=Slot;
}
void ALCCharacter::ServerFire_Implementation(FVector_NetQuantizeNormal Direction) {
 if(!CanAct() || !IsArmed() || bParachute || bHealing || !Controller)return;
 const double Now=GetWorld()->GetTimeSeconds();
 if(!LCRules::CanFire(!bDead,!bOnPlane,bReloading,Ammo(),Now,NextShot))return;
 FVector Dir=FVector(Direction).GetSafeNormal();
 if(Dir.ContainsNaN() || Dir.IsNearlyZero() || FVector::DotProduct(Dir,GetBaseAimRotation().Vector())<.5f)return;
 NextShot=Now+(Weapon==0?.12:.32);
 if(Weapon==0)--RifleAmmo;else --PistolAmmo;
 const FVector Start=GetPawnViewLocation(); const FVector End=Start+Dir*(Weapon==0?22000:9000);
 FHitResult H;FCollisionQueryParams Q;Q.AddIgnoredActor(this);
 GetWorld()->LineTraceSingleByChannel(H,Start,End,ECC_Visibility,Q);
 if(auto* Victim=Cast<ALCCharacter>(H.GetActor())) {
  const bool Head=H.ImpactPoint.Z>Victim->GetActorLocation().Z+50;
  UGameplayStatics::ApplyDamage(Victim,(Weapon==0?25.f:18.f)*(Head?1.6f:1.f),Controller,this,UDamageType::StaticClass());
 }
 MulticastShot(H.bBlockingHit?H.ImpactPoint:End);
}
void ALCCharacter::MulticastShot_Implementation(FVector_NetQuantize End) {
 if(GetNetMode()!=NM_DedicatedServer) DrawDebugLine(GetWorld(),GetPawnViewLocation(),End,FColor(255,212,95),false,.07f,0,1.5f);
}
void ALCCharacter::ServerReload_Implementation() {
 if(!CanAct() || !IsArmed() || bReloading || bHealing || Reserve()<=0 || Ammo()>=(Weapon==0?30:12))return;
 bReloading=true; const int Slot=Weapon;
 GetWorldTimerManager().SetTimer(ReloadTimer,FTimerDelegate::CreateWeakLambda(this,[this,Slot]{
  if(!bDead && CanAct()) {
   int32& A=Slot==0?RifleAmmo:PistolAmmo; int32& R=Slot==0?RifleReserve:PistolReserve;
   const int N=LCRules::ReloadTransfer(A,Slot==0?30:12,R);A+=N;R-=N;
  } bReloading=false;
 }),Weapon==0?2.2f:1.5f,false);
}
void ALCCharacter::ServerHeal_Implementation() {
 if(!CanAct() || bHealing || bReloading || Medkits<=0 || Health>=100)return;
 bHealing=true;
 GetWorldTimerManager().SetTimer(HealTimer,FTimerDelegate::CreateWeakLambda(this,[this]{
  if(!bDead && CanAct() && Medkits>0){--Medkits;Health=FMath::Min(100.f,Health+50);}bHealing=false;
 }),3.f,false);
}
void ALCCharacter::ServerInteract_Implementation() {
 if(!CanAct() || bParachute)return;
 ALCPickup* Best=nullptr;float Dist=220*220;
 for(TActorIterator<ALCPickup> It(GetWorld());It;++It) {
  float D=FVector::DistSquared(GetActorLocation(),It->GetActorLocation());
  if(D<Dist){FHitResult H;FCollisionQueryParams Q;Q.AddIgnoredActor(this);
   GetWorld()->LineTraceSingleByChannel(H,GetPawnViewLocation(),It->GetActorLocation(),ECC_Visibility,Q);
   if(!H.bBlockingHit || H.GetActor()==*It){Best=*It;Dist=D;}}
 }
 if(Best && TryLoot(Best->Kind))Best->Destroy();
}
bool ALCCharacter::TryLoot(int Kind) {
 if(!HasAuthority() || !CanAct())return false;
 if(Kind==0){if(bHasRifle)return false;bHasRifle=true;RifleAmmo=30;RifleReserve+=60;Weapon=0;}
 else if(Kind==1){if(bHasPistol)return false;bHasPistol=true;PistolAmmo=12;PistolReserve+=36;if(!bHasRifle)Weapon=1;}
 else if(Kind==2){if(RifleReserve>=240 && PistolReserve>=120)return false;RifleReserve=FMath::Min(240,RifleReserve+30);PistolReserve=FMath::Min(120,PistolReserve+12);}
 else if(Kind==3){if(Medkits>=5)return false;++Medkits;}
 else return false;
 return true;
}
void ALCCharacter::ServerDrop_Implementation(){DropFromPlane();}
void ALCCharacter::DropFromPlane(){if(HasAuthority()&&bOnPlane&&!bDead){bOnPlane=false;GetCharacterMovement()->SetMovementMode(MOVE_Falling);}}
float ALCCharacter::TakeDamage(float Amount,const FDamageEvent& E,AController* I,AActor* C) {
 if(!HasAuthority() || !CanAct() || !FMath::IsFinite(Amount) || Amount<=0)return 0;
 Health=FMath::Max(0.f,Health-Amount); bHealing=false;GetWorldTimerManager().ClearTimer(HealTimer);
 if(Health<=0)Eliminate();return Amount;
}
void ALCCharacter::Eliminate(){
 if(!HasAuthority() || bDead)return;
 bDead=true;Health=0;bAiming=false;bSprinting=false;bReloading=false;bHealing=false;
 GetWorldTimerManager().ClearTimer(ReloadTimer);GetWorldTimerManager().ClearTimer(HealTimer);
 GetCharacterMovement()->DisableMovement();GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::NoCollision);
 if(auto* P=GetPlayerState<ALCPlayerState>())P->bEliminated=true;
 if(auto* GM=GetWorld()->GetAuthGameMode<ALCGameMode>())GM->OnEliminated(this);
 if(auto* PC=Cast<ALCController>(Controller))PC->ClientEliminated();
}
void ALCCharacter::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const {
 Super::GetLifetimeReplicatedProps(Out);
 DOREPLIFETIME(ALCCharacter,Health);DOREPLIFETIME(ALCCharacter,bDead);DOREPLIFETIME(ALCCharacter,bOnPlane);
 DOREPLIFETIME(ALCCharacter,FlightSeat);
 DOREPLIFETIME(ALCCharacter,bParachute);DOREPLIFETIME(ALCCharacter,bAiming);DOREPLIFETIME(ALCCharacter,bSprinting);
 DOREPLIFETIME(ALCCharacter,bReloading);DOREPLIFETIME(ALCCharacter,bHealing);
 DOREPLIFETIME(ALCCharacter,bHasRifle);DOREPLIFETIME(ALCCharacter,bHasPistol);DOREPLIFETIME(ALCCharacter,Weapon);
 DOREPLIFETIME(ALCCharacter,RifleAmmo);DOREPLIFETIME(ALCCharacter,RifleReserve);
 DOREPLIFETIME(ALCCharacter,PistolAmmo);DOREPLIFETIME(ALCCharacter,PistolReserve);DOREPLIFETIME(ALCCharacter,Medkits);
}
