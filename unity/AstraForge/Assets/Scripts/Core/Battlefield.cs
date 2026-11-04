using System;
using System.Collections.Generic;
using System.Linq;

namespace AstraForge
{
    public sealed class UnitState { public int Id, Cell, Upgrade; public string HeroId, Owner; public double Cooldown; }
    public sealed class MonsterState { public int Id; public MonsterType Type; public double Hp, MaxHp, Progress, Speed; public bool Dead; }
    public sealed class CombatEvent { public int UnitId, MonsterId; public double Damage, TargetProgress; public bool Critical; }
    public sealed class SummonData
    {
        public int Cost = 25;
        public readonly Dictionary<HeroGrade, double> Chances = new Dictionary<HeroGrade, double> { { HeroGrade.Common, .88 }, { HeroGrade.Rare, .10 }, { HeroGrade.Heroic, .02 } };
        public void Validate(GameCatalog catalog) { if (Cost <= 0 || Chances.Any(c => c.Value < 0 || !catalog.Heroes.Values.Any(h => h.Grade == c.Key)) || Math.Abs(Chances.Values.Sum() - 1) > .000001) throw new ArgumentException("Invalid summon probabilities"); }
    }
    public sealed class BattlefieldManager
    {
        public const int Width = 8, Height = 5;
        public readonly List<UnitState> Units = new List<UnitState>();
        public readonly List<MonsterState> Monsters = new List<MonsterState>();
        public readonly List<CombatEvent> Events = new List<CombatEvent>();
        public readonly Dictionary<string, int> Coins;
        public readonly GameCatalog Catalog;
        public readonly SummonData SummonSettings;
        public readonly BalanceSettings Settings;
        public int Wave { get; private set; } = 1;
        public int BaseHp { get; private set; } = 20;
        public int Kills { get; private set; }
        public int BossKills { get; private set; }
        public bool Cleared { get; private set; }
        public bool Finished => BaseHp <= 0 || Cleared;
        private readonly DeterministicRandom random;
        private readonly HashSet<string> commands = new HashSet<string>();
        private double spawnClock, waveClock, elapsedWave;
        private int spawned, nextUnit, nextMonster;
        public BattlefieldManager(IEnumerable<string> players, uint seed, GameCatalog catalog = null, SummonData summon = null, BalanceSettings settings = null)
        {
            Catalog = catalog ?? GameCatalog.CreateDefault(); Settings = settings ?? new BalanceSettings(); SummonSettings = summon ?? Settings.Summon(); SummonSettings.Validate(Catalog);
            var ids = players.ToArray(); if (ids.Length < 1 || ids.Length > 2 || ids.Distinct().Count() != ids.Length) throw new ArgumentException("One or two owners per battlefield");
            Coins = ids.ToDictionary(id => id, _ => 100); random = new DeterministicRandom(seed);
        }
        private void ValidateCommand(string owner, string command)
        {
            if (Finished || !Coins.ContainsKey(owner) || string.IsNullOrWhiteSpace(command) || commands.Contains(owner + ":" + command)) throw new InvalidOperationException("Invalid or duplicate command");
        }
        private void Commit(string owner, string command) { commands.Add(owner + ":" + command); }
        private int FreeCell() { for (int i = 0; i < Width * Height; i++) if (Units.All(u => u.Cell != i)) return i; throw new InvalidOperationException("Battlefield is full"); }
        public UnitState Summon(string owner, string command)
        {
            ValidateCommand(owner, command); int cell = FreeCell(); if (Coins[owner] < SummonSettings.Cost) throw new InvalidOperationException("Insufficient coins");
            double draw = random.Next(); HeroGrade grade = HeroGrade.Common;
            foreach (var chance in SummonSettings.Chances.OrderBy(c => c.Key)) { draw -= chance.Value; if (draw < 0) { grade = chance.Key; break; } }
            var choices = Catalog.Heroes.Values.Where(h => h.Grade == grade).OrderBy(h => h.Id).ToArray(); var hero = choices[random.Next(choices.Length)];
            var unit = new UnitState { Id = ++nextUnit, Owner = owner, HeroId = hero.Id, Cell = cell }; Coins[owner] -= SummonSettings.Cost; Units.Add(unit); Commit(owner, command); return unit;
        }
        public void Move(string owner, int id, int cell, string command)
        { ValidateCommand(owner, command); var unit = Units.Single(u => u.Id == id); if (unit.Owner != owner || cell < 0 || cell >= Width * Height || Units.Any(u => u.Id != id && u.Cell == cell)) throw new InvalidOperationException("Invalid placement or ownership"); unit.Cell = cell; Commit(owner, command); }
        public UnitState Merge(string owner, int[] ids, string command)
        {
            ValidateCommand(owner, command);
            if (ids.Length != 3 || ids.Distinct().Count() != 3) throw new InvalidOperationException("Merge requires three distinct units");
            var materials = ids.Select(id => Units.Single(u => u.Id == id)).ToArray(); var hero = Catalog.Heroes[materials[0].HeroId];
            if (materials.Any(u => u.Owner != owner || u.HeroId != hero.Id) || hero.NextId == null) throw new InvalidOperationException("Wrong materials or ownership");
            return Replace(owner, materials, hero.NextId, command);
        }
        public UnitState Combine(string owner, string recipeId, string command)
        {
            ValidateCommand(owner, command); var recipe = Catalog.Recipes[recipeId]; var materials = new List<UnitState>();
            foreach (var required in recipe.Materials) { var owned = Units.Where(u => u.Owner == owner && u.HeroId == required.Key).Take(required.Value).ToArray(); if (owned.Length != required.Value) throw new InvalidOperationException("Insufficient recipe materials"); materials.AddRange(owned); }
            return Replace(owner, materials.ToArray(), recipe.ResultId, command);
        }
        private UnitState Replace(string owner, UnitState[] materials, string resultId, string command)
        {
            var result = new UnitState { Id = ++nextUnit, Owner = owner, HeroId = resultId, Cell = materials[0].Cell };
            Units.RemoveAll(u => materials.Contains(u)); Units.Add(result); Commit(owner, command); return result;
        }
        public void Upgrade(string owner, int id, string command)
        {
            ValidateCommand(owner, command); var unit = Units.Single(u => u.Id == id); int cost = 40 + unit.Upgrade * 25;
            if (unit.Owner != owner || unit.Upgrade >= 10 || Coins[owner] < cost) throw new InvalidOperationException("Upgrade rejected"); Coins[owner] -= cost; unit.Upgrade++; Commit(owner, command);
        }
        public static Tuple<double, double> Path(double progress)
        {
            double d = Math.Max(0, Math.Min(.999999, progress)) * 26;
            if (d < 8) return Tuple.Create(d, -.7);
            if (d < 13) return Tuple.Create(8.7, d - 8);
            if (d < 21) return Tuple.Create(8 - (d - 13), 5.7);
            return Tuple.Create(-.7, 5 - (d - 21));
        }
        public void Tick(double dt)
        {
            if (dt <= 0 || dt > .25 || double.IsNaN(dt)) throw new ArgumentOutOfRangeException(nameof(dt));
            Events.Clear(); if (Finished) return; elapsedWave += dt;
            int count = Wave % 5 == 0 ? 1 : 7 + Wave * 2;
            spawnClock -= dt;
            if (spawned < count && spawnClock <= 0)
            {
                bool boss = Wave % 5 == 0; double hp = (boss ? 320 : 25) * Math.Pow(Settings.HpGrowth, Wave - 1);
                Monsters.Add(new MonsterState { Id = ++nextMonster, Type = boss ? MonsterType.Boss : Wave % 3 == 0 ? MonsterType.Armored : Wave % 2 == 0 ? MonsterType.Fast : MonsterType.Normal, Hp = hp, MaxHp = hp, Speed = boss ? .025 : .035 + Wave * .001 }); spawned++; spawnClock += .65;
            }
            foreach (var unit in Units)
            {
                unit.Cooldown -= dt; if (unit.Cooldown > 0) continue; var hero = Catalog.Heroes[unit.HeroId];
                var target = Monsters.Where(m => !m.Dead).OrderByDescending(m => m.Progress).FirstOrDefault(m => { var pos = Path(m.Progress); double x = unit.Cell % Width + .5 - pos.Item1, y = unit.Cell / Width + .5 - pos.Item2; return x * x + y * y <= hero.Range * hero.Range; });
                if (target == null) continue;
                bool crit = random.Next() < hero.CriticalChance; double damage = hero.Attack * (1 + .18 * unit.Upgrade) * (crit ? hero.CriticalDamage : 1);
                // Phase 2 prototype: basic single-target hit only. Special attack/skill dispatch is Phase 4.
                if (target.Type == MonsterType.Armored) damage *= .7;
                target.Hp -= damage; Events.Add(new CombatEvent { UnitId = unit.Id, MonsterId = target.Id, TargetProgress = target.Progress, Damage = damage, Critical = crit });
                unit.Cooldown = 1 / hero.AttackSpeed;
                if (target.Hp <= 0) { target.Dead = true; Kills++; if (target.Type == MonsterType.Boss) BossKills++; Coins[unit.Owner] += target.Type == MonsterType.Boss ? 20 : 3; }
            }
            foreach (var monster in Monsters.Where(m => !m.Dead)) { monster.Progress = (monster.Progress + monster.Speed * dt) % 1; }
            Monsters.RemoveAll(m => m.Dead);
            if (Monsters.Count >= Settings.MonsterLimit || Wave % 5 == 0 && elapsedWave >= Settings.BossSeconds && Monsters.Any(m => m.Type == MonsterType.Boss)) { BaseHp = 0; return; }
            if (spawned == count && Monsters.Count == 0) waveClock += dt; else waveClock = 0;
            if (!Finished && (waveClock >= 1 || Wave % 5 != 0 && elapsedWave >= Settings.WaveSeconds)) { if (Wave == 10) Cleared = true; else { Wave++; spawned = 0; spawnClock = 0; waveClock = 0; elapsedWave = 0; } }
        }
    }
    public sealed class MatchManager
    {
        public BattlefieldManager Left { get; }
        public BattlefieldManager Right { get; }
        public string WinnerTeamId { get; private set; }
        public bool RequiresRematch { get; private set; }
        private readonly string leftId, rightId;
        public MatchManager(TeamData left, TeamData right, uint seed, GameCatalog catalog = null, BalanceSettings settings = null) { if (left.Id == right.Id || left.PlayerIds.Intersect(right.PlayerIds).Any() || left.PlayerIds.Length != right.PlayerIds.Length) throw new ArgumentException("Only distinct teams in 1:1 or 2:2"); leftId = left.Id; rightId = right.Id; Left = new BattlefieldManager(left.PlayerIds, seed, catalog, settings: settings); Right = new BattlefieldManager(right.PlayerIds, seed, catalog, settings: settings); }
        public void Tick(double dt)
        {
            if (WinnerTeamId != null || RequiresRematch) return; Left.Tick(dt); Right.Tick(dt);
            if (Left.BaseHp == 0 && Right.BaseHp > 0) { WinnerTeamId = rightId; return; }
            if (Right.BaseHp == 0 && Left.BaseHp > 0) { WinnerTeamId = leftId; return; }
            if (!Left.Finished || !Right.Finished) return;
            int result = Left.Wave.CompareTo(Right.Wave); if (result == 0) result = Left.BaseHp.CompareTo(Right.BaseHp); if (result == 0) result = Left.Kills.CompareTo(Right.Kills); if (result == 0) result = Left.BossKills.CompareTo(Right.BossKills);
            if (result == 0) RequiresRematch = true; else WinnerTeamId = result > 0 ? leftId : rightId;
        }
    }
}
