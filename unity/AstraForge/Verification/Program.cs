using AstraForge;
int assertions = 0;
void Check(bool value, string label) { assertions++; if (!value) throw new Exception(label); }
void Reject(Action action, string label) { bool rejected = false; try { action(); } catch (InvalidOperationException) { rejected = true; } Check(rejected, label); }
var expectedTeams = new[] { 0, 0, 2, 3, 2, 5, 3, 7, 4 };
for (int n = 2; n <= 8; n++) for (uint seed = 1; seed <= 100; seed++)
{
    var t = new TournamentManager(Enumerable.Range(1, n).Select(i => "p" + i), seed);
    Check(t.Teams.Length == expectedTeams[n], "team count");
    Check(t.Teams.All(team => team.PlayerIds.Length == (n >= 4 && n % 2 == 0 ? 2 : 1)), "team size");
    Check(t.Teams.SelectMany(team => team.PlayerIds).Distinct().Count() == n, "unique membership");
    int played = 0; var eliminated = new HashSet<string>();
    while (t.TournamentWinnerId == null)
    {
        var ready = t.Matches.First(m => m.Status == MatchStatus.Ready);
        Check(ready.Left != null && ready.Right != null, "no empty match");
        Check(!eliminated.Contains(ready.Left) && !eliminated.Contains(ready.Right), "no eliminated return");
        t.StartMatch(ready.Id); Reject(() => t.StartMatch(ready.Id), "no duplicate start");
        Check(t.CompleteMatch(ready.Id, ready.Left), "first result");
        Check(!t.CompleteMatch(ready.Id, ready.Left), "idempotent result");
        Reject(() => t.CompleteMatch(ready.Id, ready.Right), "conflicting result");
        eliminated.Add(ready.Right); played++;
    }
    Check(played == expectedTeams[n] - 1, "match count"); Check(t.Phase == TournamentPhase.TournamentFinished, "one champion");
    Check(!eliminated.Contains(t.TournamentWinnerId), "champion survived");
}
var room = new Room("host", "Host"); Reject(() => room.Start("host", 1), "not solo"); room.Join("p2", "Guest"); room.Ready("host", true); Reject(() => room.Start("host", 1), "all ready"); room.Ready("p2", true); Reject(() => room.Start("p2", 1), "host only"); room.Start("host", 1); Reject(() => room.Start("host", 1), "start once"); Reject(() => room.Join("p3", "Late"), "lock join");
var catalog = GameCatalog.CreateDefault(); var b = new BattlefieldManager(new[] { "p1", "p2" }, 1, catalog); var u = b.Summon("p1", "s1"); Check(b.Coins["p1"] == 75 && b.Coins["p2"] == 100, "individual economy"); Reject(() => b.Summon("p1", "s1"), "no duplicate debit"); Reject(() => b.Move("p2", u.Id, 9, "steal"), "move ownership"); b.Move("p1", u.Id, 9, "move"); Check(u.Cell == 9, "move");
var merge = new BattlefieldManager(new[] { "p1", "p2" }, 1, catalog); merge.Units.AddRange(new[] { new UnitState { Id=100,Owner="p1",HeroId="ember",Cell=1 },new UnitState { Id=101,Owner="p1",HeroId="ember",Cell=2 },new UnitState { Id=102,Owner="p2",HeroId="ember",Cell=3 } }); Reject(() => merge.Merge("p1",new[]{100,101,102},"m1"),"no teammate consumption"); Check(merge.Units.Count==3,"atomic rejected merge"); merge.Units[2].Owner="p1"; var merged=merge.Merge("p1",new[]{100,101,102},"m1"); Check(merged.HeroId=="cinder"&&merge.Units.Count==1,"merge3 success");
Reject(()=>merge.Combine("p1","forge-sol","c1"),"incomplete recipe"); Check(merge.Units.Count==1,"recipe atomic");
merge.Upgrade("p1",merged.Id,"u1"); Check(merged.Upgrade==1&&merge.Coins["p1"]==60,"upgrade");
var battle=new BattlefieldManager(new[]{"p1"},4); battle.Units.Add(new UnitState{Id=100,Owner="p1",HeroId="astra",Cell=3}); bool hit=false;for(int i=0;i<2400&&!battle.Finished;i++){battle.Tick(.05);hit|=battle.Events.Count>0;} Check(hit&&battle.Kills>0,"damage death reward"); Check(battle.Wave>1,"waves advance"); Check(battle.Coins["p1"]>100,"kill rewards");
var duel=new MatchManager(new TeamData("a",new[]{"a1"}),new TeamData("b",new[]{"b1"}),1);for(int i=0;i<20000&&duel.WinnerTeamId==null&&!duel.RequiresRematch;i++)duel.Tick(.05);Check(duel.RequiresRematch,"equal match requires rematch");
Console.WriteLine($"PASS: {assertions} assertions; 700 seeded 2..8-player tournaments; room, economy, ownership, merge, combat, waves, draw.");
var fullRoom = new Room("host","Host");for(int i=2;i<=8;i++)fullRoom.Join("u"+i,"User"+i);Reject(()=>fullRoom.Join("u9","Overflow"),"eight capacity");
var recipeBattle = new BattlefieldManager(new[]{"p1"},2);int rid=100;foreach(var entry in catalog.Recipes["forge-sol"].Materials)for(int i=0;i<entry.Value;i++)recipeBattle.Units.Add(new UnitState{Id=++rid,Owner="p1",HeroId=entry.Key,Cell=rid-101});var made=recipeBattle.Combine("p1","forge-sol","recipe-success");Check(made.HeroId=="sol"&&recipeBattle.Units.Count==1,"recipe success atomically consumes exact materials");
var percentages = new double[]{100,0,0,0,0};var settings=new BalanceSettings(3,50,40,20,25,1.2,percentages);percentages[0]=0;var configured=new BattlefieldManager(new[]{"p1"},3,settings:settings);var configuredUnit=configured.Summon("p1","configured");Check(configured.Coins["p1"]==50,"configured summon price");Check(configured.Catalog.Heroes[configuredUnit.HeroId].Grade==HeroGrade.Common,"settings snapshot cloned");Check(configured.Settings.Revision==3&&configured.Settings.MonsterLimit==40,"version and limit pinned");
bool badConfig=false;try{new BalanceSettings(percentages:new double[]{80,10,2,0,0});}catch(ArgumentException){badConfig=true;}Check(badConfig,"invalid probability sum rejected");
Console.WriteLine($"PASS FINAL: {assertions} assertions including recipe success, capacity and immutable remote balance settings.");
