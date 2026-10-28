using UnrealBuildTool;
public class LastCircle : ModuleRules {
 public LastCircle(ReadOnlyTargetRules Target) : base(Target) {
  PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
  PublicDependencyModuleNames.AddRange(new [] { "Core", "CoreUObject", "Engine", "InputCore", "AIModule", "OnlineSubsystem", "OnlineSubsystemUtils", "Slate", "SlateCore", "UMG", "HTTP" });
  DynamicallyLoadedModuleNames.AddRange(new [] { "OnlineSubsystemNull", "OnlineSubsystemEOS" });
 }
}
