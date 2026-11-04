using System.Linq;
using AstraForge.Presentation;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace AstraForge.Editor
{
    public static class ProjectSetup
    {
        [MenuItem("Astra Forge/Create prototype assets and scene")]
        public static void Create()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Resources")) AssetDatabase.CreateFolder("Assets", "Resources");
            var asset = AssetDatabase.LoadAssetAtPath<HeroCatalogAsset>("Assets/Resources/HeroCatalog.asset");
            if (asset == null) { asset = ScriptableObject.CreateInstance<HeroCatalogAsset>(); asset.heroes = GameCatalog.CreateDefault().Heroes.Values.Select(h => new HeroEntry { id=h.Id,displayName=h.Name,grade=h.Grade,attackType=h.AttackType,attack=(float)h.Attack,attacksPerSecond=(float)h.AttackSpeed,range=(float)h.Range,nextId=h.NextId }).ToList(); AssetDatabase.CreateAsset(asset,"Assets/Resources/HeroCatalog.asset"); }
            asset.Build();
            if (!AssetDatabase.IsValidFolder("Assets/Scenes")) AssetDatabase.CreateFolder("Assets", "Scenes");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single); new GameObject("Prototype Bootstrap").AddComponent<DemoBootstrap>();
            EditorSceneManager.SaveScene(scene,"Assets/Scenes/Prototype.unity"); EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/Scenes/Prototype.unity",true)};
            PlayerSettings.companyName="Independent Astra Forge";PlayerSettings.productName="Astra Forge";PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android,"com.astraforge.tournament");PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.iOS,"com.astraforge.tournament");AssetDatabase.SaveAssets();
        }
    }
}
