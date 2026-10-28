#include "LCWorld.h"
#include "Engine/World.h"
#include "Engine/StaticMesh.h"
#include "LCGameState.h"
#include "LCRules.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Components/LightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Engine/World.h"
ALCWorld::ALCWorld() {
 bReplicates=true; bAlwaysRelevant=true; PrimaryActorTick.bCanEverTick=true;
 RootComponent=CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}
UStaticMeshComponent* ALCWorld::Box(FVector P, FVector S, FLinearColor C, bool Collision) {
 auto* M=NewObject<UStaticMeshComponent>(this);
 M->SetupAttachment(RootComponent);
 M->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,TEXT("/Engine/BasicShapes/Cube.Cube")));
 M->SetCollisionEnabled(Collision?ECollisionEnabled::QueryAndPhysics:ECollisionEnabled::NoCollision);
 M->SetCollisionResponseToAllChannels(ECR_Block); M->RegisterComponent();
 M->SetWorldLocation(P); M->SetWorldScale3D(S/100.f);
 if(auto* Mat=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Materials/M_Prototype.M_Prototype"))) {
  auto* D=UMaterialInstanceDynamic::Create(Mat,this); D->SetVectorParameterValue(TEXT("Color"),C); M->SetMaterial(0,D);
 }
 return M;
}
const TArray<FVector>& ALCWorld::LootLocations() {
 static TArray<FVector> Points;
 if(Points.IsEmpty()) for(int x=-2;x<=2;++x) for(int y=-2;y<=2;++y) {
  Points.Add(FVector(x*4800.f+600,y*4800.f+600,80));
  Points.Add(FVector(x*4800.f-600,y*4800.f-500,80));
  Points.Add(FVector(x*4800.f+1200,y*4800.f-1000,80));
 }
 return Points;
}
void ALCWorld::BeginPlay() {
 Super::BeginPlay();
 Box(FVector(0,0,-100),FVector(32000,32000,200),FLinearColor(.12f,.22f,.12f));
 // A grid of roofless compounds; door gaps are wider than a capsule.
 for(int x=-2;x<=2;++x) for(int y=-2;y<=2;++y) {
  FVector O(x*4800.f,y*4800.f,0); FLinearColor C(.33f,.31f,.27f);
  Box(O+FVector(-1000,0,190),FVector(80,2000,380),C);
  Box(O+FVector(1000,0,190),FVector(80,2000,380),C);
  Box(O+FVector(0,1000,190),FVector(2000,80,380),C);
  Box(O+FVector(-700,-1000,190),FVector(600,80,380),C);
  Box(O+FVector(700,-1000,190),FVector(600,80,380),C);
  Box(O+FVector(350,300,75),FVector(200,250,150),FLinearColor(.3f,.2f,.09f));
 }
 FRandomStream R(721);
 for(int i=0;i<65;++i) {
  FVector P(R.FRandRange(-14500,14500),R.FRandRange(-14500,14500),80);
  Box(P,FVector(170,220,160),FLinearColor(.21f,.24f,.2f));
 }
 // Perimeter is also the authoritative map boundary.
 Box(FVector(-15500,0,500),FVector(100,31000,1000),FLinearColor(.2f,.25f,.2f));
 Box(FVector(15500,0,500),FVector(100,31000,1000),FLinearColor(.2f,.25f,.2f));
 Box(FVector(0,-15500,500),FVector(31000,100,1000),FLinearColor(.2f,.25f,.2f));
 Box(FVector(0,15500,500),FVector(31000,100,1000),FLinearColor(.2f,.25f,.2f));
 for(int i=0;i<96;++i) Ring.Add(Box(FVector::ZeroVector,FVector(100,24,18),FLinearColor(.05f,.7f,1.f),false));
 Plane=Box(FVector(0,0,12000),FVector(200,1700,90),FLinearColor(.5f,.55f,.6f),false);
 if(GetNetMode()!=NM_DedicatedServer) {
  auto* Sun=GetWorld()->SpawnActor<ADirectionalLight>(); Sun->SetActorRotation(FRotator(-50,-30,0));
  Sun->GetLightComponent()->SetIntensity(4.f);
  auto* Sky=GetWorld()->SpawnActor<ASkyLight>(); Sky->GetLightComponent()->SetMobility(EComponentMobility::Movable);
  Sky->GetLightComponent()->SetIntensity(.8f);
 }
}
void ALCWorld::Tick(float Dt) {
 Super::Tick(Dt); const auto* G=GetWorld()->GetGameState<ALCGameState>(); if(!G)return;
 for(int i=0;i<Ring.Num();++i) {
  float A=2.f*PI*i/Ring.Num();
  Ring[i]->SetWorldLocation(FVector(G->ZoneCenter.X+FMath::Cos(A)*G->ZoneRadius,G->ZoneCenter.Y+FMath::Sin(A)*G->ZoneRadius,16));
  Ring[i]->SetWorldRotation(FRotator(0,FMath::RadiansToDegrees(A)+90,0));
  Ring[i]->SetWorldScale3D(FVector(G->ZoneRadius*2.f*PI/Ring.Num()/100.f,.24f,.18f));
  Ring[i]->SetVisibility(G->Phase==ELCPhase::Battle);
 }
 Plane->SetVisibility(G->Phase==ELCPhase::Flight);
 if(G->Phase==ELCPhase::Flight) Plane->SetWorldLocation(FVector((1.f-(G->PhaseEnds-G->GetServerWorldTimeSeconds())/LCRules::FlightSeconds)*28000.f-14000,0,12000));
}
