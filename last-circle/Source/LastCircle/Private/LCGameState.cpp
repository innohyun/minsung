#include "LCGameState.h"
#include "Net/UnrealNetwork.h"
ALCPlayerState::ALCPlayerState() { bReplicates = true; }
void ALCPlayerState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const {
 Super::GetLifetimeReplicatedProps(Out); DOREPLIFETIME(ALCPlayerState, bEliminated);
}
void ALCGameState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const {
 Super::GetLifetimeReplicatedProps(Out);
 DOREPLIFETIME(ALCGameState, Phase); DOREPLIFETIME(ALCGameState, Alive);
 DOREPLIFETIME(ALCGameState, Humans); DOREPLIFETIME(ALCGameState, RoomName);
 DOREPLIFETIME(ALCGameState, Winner); DOREPLIFETIME(ALCGameState, PhaseEnds);
 DOREPLIFETIME(ALCGameState, ZoneStage); DOREPLIFETIME(ALCGameState, ZoneCenter);
 DOREPLIFETIME(ALCGameState, NextCenter); DOREPLIFETIME(ALCGameState, ZoneRadius);
 DOREPLIFETIME(ALCGameState, NextRadius); DOREPLIFETIME(ALCGameState, bShrinking);
}
