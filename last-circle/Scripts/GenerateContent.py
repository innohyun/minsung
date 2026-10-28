"""Run with UnrealEditor-Cmd -run=pythonscript; generates reproducible project-owned assets."""
import unreal


def make_material(path, sky=False):
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        return
    folder, name = path.rsplit("/", 1)
    mat = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        name, folder, unreal.Material, unreal.MaterialFactoryNew()
    )
    if mat is None:
        raise RuntimeError("Could not create " + path)
    color = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionVectorParameter, -250, 0
    )
    color.set_editor_property("parameter_name", "Color")
    color.set_editor_property("default_value", unreal.LinearColor(0.12, 0.22, 0.32, 1) if sky else unreal.LinearColor(0.3, 0.4, 0.4, 1))
    if sky:
        mat.set_editor_property("two_sided", True)
        mat.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    unreal.MaterialEditingLibrary.connect_material_property(
        color, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR if sky else unreal.MaterialProperty.MP_BASE_COLOR
    )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    if not unreal.EditorAssetLibrary.save_loaded_asset(mat):
        raise RuntimeError("Could not save " + path)


def main():
    make_material("/Game/Materials/M_Prototype")
    make_material("/Game/Materials/M_Sky", sky=True)
    levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    for name in ("FrontEnd", "Arena"):
        path = "/Game/Maps/" + name
        if unreal.EditorAssetLibrary.does_asset_exist(path):
            continue
        if not levels.new_level(path):
            raise RuntimeError("Could not create " + path)
        actors.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(0, 0, 12500))
        sky = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0))
        mesh = sky.static_mesh_component
        mesh.set_static_mesh(unreal.load_asset("/Engine/BasicShapes/Sphere"))
        mesh.set_material(0, unreal.load_asset("/Game/Materials/M_Sky"))
        mesh.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
        mesh.set_editor_property("cast_shadow", False)
        sky.set_actor_scale3d(unreal.Vector(1000, 1000, 1000))
        if not levels.save_current_level():
            raise RuntimeError("Could not save " + path)
    unreal.log("LAST_CIRCLE_CONTENT_OK")


main()
