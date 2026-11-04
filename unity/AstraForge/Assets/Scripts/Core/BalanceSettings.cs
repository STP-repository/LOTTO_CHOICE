using System;
namespace AstraForge
{
    public sealed class BalanceSettings
    {
        public int Revision { get; }
        public int SummonCost { get; }
        public int MonsterLimit { get; }
        public double WaveSeconds { get; }
        public double BossSeconds { get; }
        public double HpGrowth { get; }
        private readonly double[] chances;
        public BalanceSettings(int revision = 0, int summonCost = 25, int monsterLimit = 50, double waveSeconds = 25, double bossSeconds = 30, double hpGrowth = 1.4, double[] percentages = null)
        {
            chances = (double[])(percentages ?? new double[] { 88, 10, 2, 0, 0 }).Clone();
            double sum = 0; foreach (var value in chances) { if (double.IsNaN(value) || value < 0 || value > 100) throw new ArgumentException("Invalid summon percentage"); sum += value; }
            if (revision < 0 || summonCost < 1 || summonCost > 10000 || monsterLimit < 10 || monsterLimit > 200 || double.IsNaN(waveSeconds) || waveSeconds < 10 || waveSeconds > 120 || double.IsNaN(bossSeconds) || bossSeconds < 10 || bossSeconds > 180 || double.IsNaN(hpGrowth) || hpGrowth < 1.05 || hpGrowth > 2 || chances.Length != 5 || Math.Abs(sum - 100) > .000001) throw new ArgumentException("Invalid balance settings");
            Revision = revision; SummonCost = summonCost; MonsterLimit = monsterLimit; WaveSeconds = waveSeconds; BossSeconds = bossSeconds; HpGrowth = hpGrowth;
        }
        public SummonData Summon() { var result = new SummonData { Cost = SummonCost }; result.Chances.Clear(); for (int i = 0; i < chances.Length; i++) result.Chances[(HeroGrade)i] = chances[i] / 100; return result; }
    }
}
