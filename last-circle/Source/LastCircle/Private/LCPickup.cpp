#include "LCPickup.h"
#include "Engine/World.h"
#include "Engine/StaticMesh.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Net/UnrealNetwork.h"
#include "UObject/ConstructorHelpers.h"
ALCPickup::ALCPickup(){
 bReplicates=true;
 Mesh=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Pickup"));RootComponent=Mesh;
 static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));Mesh->SetStaticMesh(Cube.Object);
 Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);Mesh->SetRelativeScale3D(FVector(.5f,.35f,.2f));
}
void ALCPickup::BeginPlay(){Super::BeginPlay();OnRepKind();}
void ALCPickup::OnRepKind(){
 if(auto* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Materials/M_Prototype.M_Prototype"))){
  auto* Mat=UMaterialInstanceDynamic::Create(Base,this);
  const FLinearColor Colors[]={FLinearColor(.8f,.5f,.1f),FLinearColor(.5f,.6f,.8f),FLinearColor(.65f,.65f,.2f),FLinearColor(.15f,.8f,.5f)};
  Mat->SetVectorParameterValue(TEXT("Color"),Colors[FMath::Clamp(Kind,0,3)]);Mesh->SetMaterial(0,Mat);
 }
}
FString ALCPickup::Label(int K){switch(K){case 0:return TEXT("RIFLE");case 1:return TEXT("PISTOL");case 2:return TEXT("AMMO");default:return TEXT("MEDKIT");}}
void ALCPickup::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out)const{Super::GetLifetimeReplicatedProps(Out);DOREPLIFETIME(ALCPickup,Kind);}
