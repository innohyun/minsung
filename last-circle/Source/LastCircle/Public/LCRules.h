#pragma once
// Engine-independent authoritative rules. Keep gameplay and tests on the same logic.
#include <algorithm>
#include <cmath>
namespace LCRules {
constexpr int Slots = 10;
constexpr float MapHalf = 15000.f;
constexpr float InitialRadius = 19000.f;
constexpr int ZonePhases = 7;
constexpr float FlightSeconds = 30.f;
constexpr float HoldSeconds = 55.f;
constexpr float ShrinkSeconds = 45.f;
inline bool CanStart(int humans, bool lobby, bool host) {
 return lobby && host && humans >= 1 && humans <= Slots;
}
inline int BotsToFill(int humans) { return std::clamp(Slots - humans, 0, Slots); }
inline float ZoneRadius(int phase) {
 return phase <= 0 ? InitialRadius : (phase >= ZonePhases ? 0.f : InitialRadius * std::pow(0.64f, float(phase)));
}
inline float ZoneDamage(int phase) { return 2.f + std::max(phase, 0) * 1.5f; }
inline float LerpRadius(float from, float to, float elapsed) {
 const float t = std::clamp(elapsed / ShrinkSeconds, 0.f, 1.f);
 return from + (to - from) * t;
}
inline bool Outside(float x, float y, float cx, float cy, float radius) {
 const float dx=x-cx, dy=y-cy; return dx*dx+dy*dy > radius*radius;
}
inline bool CanFire(bool alive, bool grounded, bool reloading, int ammo, double now, double next) {
 return alive && grounded && !reloading && ammo > 0 && now >= next;
}
inline int ReloadTransfer(int magazine, int capacity, int reserve) {
 return std::max(0, std::min(capacity-magazine, reserve));
}
}
