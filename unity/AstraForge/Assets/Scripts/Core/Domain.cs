using System;
using System.Collections.Generic;
using System.Linq;

namespace AstraForge
{
    public enum TournamentPhase { Waiting, TeamAssignment, BracketGeneration, RoundReady, MatchStarting, InMatch, MatchFinished, RoundFinished, TournamentFinished }
    public enum MatchStatus { Waiting, Ready, InMatch, Finished, Bye }
    public enum HeroGrade { Common, Rare, Heroic, Legendary, Mythic }
    public enum AttackType { Single, Splash, Chain, Piercing, DamageOverTime }
    public enum MonsterType { Normal, Fast, Armored, Elite, Boss }
    public sealed class HeroData
    {
        public string Id, Name, NextId;
        public HeroGrade Grade;
        public AttackType AttackType;
        public double Attack, AttackSpeed, Range, CriticalChance, CriticalDamage;
        public HeroData(string id, string name, HeroGrade grade, double attack, AttackType type, string next = null)
        { Id = id; Name = name; Grade = grade; Attack = attack; AttackType = type; NextId = next; AttackSpeed = 1; Range = 4; CriticalChance = .08; CriticalDamage = 1.7; }
    }
    public sealed class CombinationRecipeData
    {
        public string Id, ResultId;
        public Dictionary<string, int> Materials;
        public CombinationRecipeData(string id, string result, Dictionary<string, int> materials) { Id = id; ResultId = result; Materials = materials; }
    }
    public sealed class GameCatalog
    {
        public readonly Dictionary<string, HeroData> Heroes;
        public readonly Dictionary<string, CombinationRecipeData> Recipes;
        public GameCatalog(IEnumerable<HeroData> heroes, IEnumerable<CombinationRecipeData> recipes)
        {
            Heroes = heroes.ToDictionary(h => h.Id); Recipes = recipes.ToDictionary(r => r.Id);
            if (Heroes.Count == 0) throw new ArgumentException("Empty hero catalog");
            foreach (var h in Heroes.Values)
                if (string.IsNullOrWhiteSpace(h.Id) || h.Attack <= 0 || h.AttackSpeed <= 0 || h.Range <= 0 || h.CriticalChance < 0 || h.CriticalChance > 1 || h.NextId != null && (!Heroes.ContainsKey(h.NextId) || Heroes[h.NextId].Grade != h.Grade + 1)) throw new ArgumentException("Invalid hero: " + h.Id);
            foreach (var r in Recipes.Values)
                if (!Heroes.ContainsKey(r.ResultId) || r.Materials.Count == 0 || r.Materials.Any(m => !Heroes.ContainsKey(m.Key) || m.Value < 1 || Heroes[m.Key].Grade >= Heroes[r.ResultId].Grade)) throw new ArgumentException("Invalid recipe: " + r.Id);
        }
        public static GameCatalog CreateDefault()
        {
            var heroes = new[] {
                new HeroData("ember", "Ember Scout", HeroGrade.Common, 7, AttackType.Single, "cinder"),
                new HeroData("brook", "Brook Archer", HeroGrade.Common, 6, AttackType.Single, "tide"),
                new HeroData("spark", "Spark Adept", HeroGrade.Common, 5, AttackType.Single, "storm"),
                new HeroData("cinder", "Cinder Knight", HeroGrade.Rare, 25, AttackType.Splash, "sol"),
                new HeroData("tide", "Tide Ranger", HeroGrade.Rare, 23, AttackType.Piercing, "moon"),
                new HeroData("storm", "Storm Weaver", HeroGrade.Rare, 21, AttackType.Chain, "sol"),
                new HeroData("sol", "Solar Sentinel", HeroGrade.Heroic, 85, AttackType.Splash, "nova"),
                new HeroData("moon", "Moon Warden", HeroGrade.Heroic, 80, AttackType.DamageOverTime, "nova"),
                new HeroData("nova", "Nova Sovereign", HeroGrade.Legendary, 270, AttackType.Chain, "astra"),
                new HeroData("astra", "Astra Phoenix", HeroGrade.Mythic, 900, AttackType.Splash) };
            return new GameCatalog(heroes, new[] {
                new CombinationRecipeData("forge-sol", "sol", new Dictionary<string,int>{{"cinder",1},{"tide",1},{"storm",2}}),
                new CombinationRecipeData("forge-nova", "nova", new Dictionary<string,int>{{"sol",1},{"moon",2}}),
                new CombinationRecipeData("forge-astra", "astra", new Dictionary<string,int>{{"nova",2},{"moon",1}}) });
        }
    }
    public sealed class DeterministicRandom
    {
        private uint state;
        public DeterministicRandom(uint seed) { state = seed == 0 ? 1u : seed; }
        public double Next() { state ^= state << 13; state ^= state >> 17; state ^= state << 5; return state / 4294967296.0; }
        public int Next(int maximum) { if (maximum < 1) throw new ArgumentOutOfRangeException(nameof(maximum)); return (int)(Next() * maximum); }
        public void Shuffle<T>(IList<T> list) { for (int i = list.Count - 1; i > 0; i--) { int j = Next(i + 1); T old = list[i]; list[i] = list[j]; list[j] = old; } }
    }
    public sealed class PlayerData { public string Id, Name; public bool Ready; public PlayerData(string id, string name) { Id = id; Name = name; } }
    public sealed class TeamData { public string Id; public string[] PlayerIds; public TeamData(string id, string[] players) { Id = id; PlayerIds = players; } }
    public sealed class MatchData
    {
        public string Id, Left, Right, LeftSource, RightSource, WinnerTeamId, LoserTeamId, ByeTeamId;
        public int RoundIndex;
        public MatchStatus Status;
    }
}
