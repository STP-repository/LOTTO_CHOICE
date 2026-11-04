using System;
using System.Collections.Generic;
using System.Linq;

namespace AstraForge
{
    public sealed class TournamentManager
    {
        public string TournamentId { get; }
        public TeamData[] Teams { get; }
        public IReadOnlyList<MatchData> Matches => matches;
        public string TournamentWinnerId { get; private set; }
        public TournamentPhase Phase { get; private set; }
        private readonly List<MatchData> matches = new List<MatchData>();
        public TournamentManager(IEnumerable<string> participants, uint seed)
        {
            var ids = participants.ToList();
            if (ids.Count < 2 || ids.Count > 8 || ids.Any(string.IsNullOrWhiteSpace) || ids.Distinct().Count() != ids.Count) throw new ArgumentException("Require 2..8 unique players");
            TournamentId = "tournament-" + seed; Phase = TournamentPhase.TeamAssignment;
            var random = new DeterministicRandom(seed); random.Shuffle(ids);
            int size = ids.Count >= 4 && ids.Count % 2 == 0 ? 2 : 1;
            Teams = Enumerable.Range(0, ids.Count / size).Select(i => new TeamData("team-" + i, ids.Skip(i * size).Take(size).ToArray())).ToArray();
            Phase = TournamentPhase.BracketGeneration;
            var teams = Teams.Select(t => t.Id).ToList(); random.Shuffle(teams);
            int slots = 2; while (slots < teams.Count) slots *= 2;
            int byes = slots - teams.Count, cursor = 0;
            var pairs = new List<Tuple<string, string>>();
            for (int i = 0; i < byes; i++) pairs.Add(Tuple.Create(teams[cursor++], (string)null));
            while (cursor < teams.Count) pairs.Add(Tuple.Create(teams[cursor++], teams[cursor++]));
            random.Shuffle(pairs);
            for (int i = 0; i < pairs.Count; i++) matches.Add(new MatchData { Id = "r0-m" + i, RoundIndex = 0, Left = pairs[i].Item1, Right = pairs[i].Item2, Status = MatchStatus.Waiting });
            var previous = matches.ToList(); int round = 1;
            while (previous.Count > 1)
            {
                var next = new List<MatchData>();
                for (int i = 0; i < previous.Count; i += 2) { var m = new MatchData { Id = "r" + round + "-m" + i / 2, RoundIndex = round, LeftSource = previous[i].Id, RightSource = previous[i + 1].Id, Status = MatchStatus.Waiting }; matches.Add(m); next.Add(m); }
                previous = next; round++;
            }
            Refresh();
        }
        private MatchData Find(string id) => matches.Single(m => m.Id == id);
        private void Refresh()
        {
            foreach (var m in matches.Where(m => m.Status == MatchStatus.Waiting))
            {
                if (m.LeftSource != null) { var a = Find(m.LeftSource); var b = Find(m.RightSource); if (a.WinnerTeamId == null || b.WinnerTeamId == null) continue; m.Left = a.WinnerTeamId; m.Right = b.WinnerTeamId; }
                if (m.Left == null) throw new InvalidOperationException("Empty-versus-empty bracket");
                if (m.Right == null) { m.Status = MatchStatus.Bye; m.ByeTeamId = m.Left; m.WinnerTeamId = m.Left; }
                else m.Status = MatchStatus.Ready;
            }
            TournamentWinnerId = matches.Last().WinnerTeamId;
            Phase = TournamentWinnerId != null ? TournamentPhase.TournamentFinished : matches.Any(m => m.Status == MatchStatus.InMatch) ? TournamentPhase.InMatch : TournamentPhase.RoundReady;
        }
        public void StartMatch(string id)
        {
            var m = Find(id); if (m.Status != MatchStatus.Ready) throw new InvalidOperationException("Match is not ready");
            m.Status = MatchStatus.InMatch; Phase = TournamentPhase.InMatch;
        }
        public bool CompleteMatch(string id, string winner)
        {
            var m = Find(id);
            if (m.Status == MatchStatus.Finished) { if (m.WinnerTeamId != winner) throw new InvalidOperationException("Conflicting result"); return false; }
            if (m.Status != MatchStatus.InMatch || winner != m.Left && winner != m.Right) throw new InvalidOperationException("Invalid result");
            m.WinnerTeamId = winner; m.LoserTeamId = winner == m.Left ? m.Right : m.Left; m.Status = MatchStatus.Finished; Phase = TournamentPhase.MatchFinished; Refresh(); return true;
        }
    }
    // Authority-side room state. Transport/authentication are intentionally not simulated here.
    public sealed class Room
    {
        public string Code { get; }
        public string HostId { get; private set; }
        public IReadOnlyList<PlayerData> Players => players;
        private readonly List<PlayerData> players = new List<PlayerData>();
        public TournamentManager Tournament { get; private set; }
        public Room(string hostId, string name) { Code = Guid.NewGuid().ToString("N").Substring(0, 6).ToUpperInvariant(); Join(hostId, name); HostId = hostId; }
        public void Join(string id, string name) { if (Tournament != null || players.Count == 8 || string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(name) || players.Any(p => p.Id == id)) throw new InvalidOperationException("Cannot join room"); players.Add(new PlayerData(id, name)); }
        public void Leave(string id) { if (Tournament != null) throw new InvalidOperationException("Use match disconnect policy after start"); if (players.RemoveAll(p => p.Id == id) == 0) throw new InvalidOperationException("Unknown player"); if (HostId == id) HostId = players.FirstOrDefault()?.Id; }
        public void Ready(string id, bool ready) { if (Tournament != null) throw new InvalidOperationException("Already started"); players.Single(p => p.Id == id).Ready = ready; }
        public TournamentManager Start(string caller, uint seed) { if (caller != HostId || Tournament != null || players.Count < 2 || players.Any(p => !p.Ready)) throw new InvalidOperationException("All players must be ready; only host may start once"); Tournament = new TournamentManager(players.Select(p => p.Id), seed); return Tournament; }
    }
}
