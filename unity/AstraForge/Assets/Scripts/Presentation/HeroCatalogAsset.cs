using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace AstraForge.Presentation
{
    [Serializable] public sealed class HeroEntry
    {
        public string id, displayName, nextId;
        public HeroGrade grade;
        public AttackType attackType;
        public float attack = 7, attacksPerSecond = 1, range = 4, criticalChance = .08f, criticalDamage = 1.7f;
    }
    [CreateAssetMenu(menuName = "Astra Forge/Hero Catalog")]
    public sealed class HeroCatalogAsset : ScriptableObject
    {
        public List<HeroEntry> heroes = new List<HeroEntry>();
        public GameCatalog Build()
        {
            var defaults = GameCatalog.CreateDefault();
            return new GameCatalog(heroes.Select(h => new HeroData(h.id, h.displayName, h.grade, h.attack, h.attackType, string.IsNullOrEmpty(h.nextId) ? null : h.nextId) { AttackSpeed = h.attacksPerSecond, Range = h.range, CriticalChance = h.criticalChance, CriticalDamage = h.criticalDamage }), defaults.Recipes.Values);
        }
    }
}
