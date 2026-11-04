using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace AstraForge.Presentation
{
    // Local authority prototype. No remote players or online connectivity are represented as live.
    public sealed class DemoBootstrap : MonoBehaviour
    {
        private TournamentManager tournament;
        private BalanceSettings settings = new BalanceSettings();
        private MatchData active;
        private MatchManager battle;
        private int participants = 2, selectedUnit, command, rematch;
        private string human, notice = "Local prototype. Internet multiplayer is not connected.";
        private double accumulator, botClock;
        private bool focused = true, submitted;
        private readonly Dictionary<string, GameObject> views = new Dictionary<string, GameObject>();
        private readonly Queue<LineRenderer> lines = new Queue<LineRenderer>();
        private readonly List<Tuple<LineRenderer, float>> pulses = new List<Tuple<LineRenderer, float>>();
        private readonly List<GameObject> stage = new List<GameObject>();
        private Material beam;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Boot() { if (FindFirstObjectByType<DemoBootstrap>() == null) new GameObject("Astra Forge - local prototype").AddComponent<DemoBootstrap>(); }
        private void Awake()
        {
            StartCoroutine(RemoteSettings.Fetch(value=>{settings=value;notice="Remote settings v"+value.Revision+" loaded for the next match.";},error=>notice=error));
            Application.targetFrameRate = 60; Screen.sleepTimeout = SleepTimeout.NeverSleep;
            var camera = new GameObject("Battle Camera").AddComponent<Camera>(); camera.tag = "MainCamera"; camera.orthographic = true; camera.transform.position = new Vector3(0, 15, -11); camera.transform.LookAt(new Vector3(0, 0, 0)); camera.backgroundColor = new Color(.025f, .035f, .09f); camera.clearFlags = CameraClearFlags.SolidColor;
            var light = new GameObject("Key Light").AddComponent<Light>(); light.type = LightType.Directional; light.intensity = 1.4f; light.transform.rotation = Quaternion.Euler(50, -30, 0);
            beam = new Material(Shader.Find("Sprites/Default"));
            for (int i = 0; i < 48; i++) { var line = new GameObject("Pooled attack beam").AddComponent<LineRenderer>(); line.material = beam; line.positionCount = 2; line.startWidth = .10f; line.endWidth = .025f; line.gameObject.SetActive(false); lines.Enqueue(line); }
        }
        private void Begin()
        {
            var room = new Room("p1", "You"); for (int i = 2; i <= participants; i++) room.Join("p" + i, "Local bot " + i);
            foreach (var player in room.Players) room.Ready(player.Id, true);
            tournament = room.Start("p1", (uint)DateTime.UtcNow.Ticks); human = "p1"; NextMatch();
        }
        private void NextMatch()
        {
            foreach (var go in views.Values) Destroy(go); views.Clear(); foreach (var go in stage) Destroy(go); stage.Clear();
            active = tournament.Matches.FirstOrDefault(m => m.Status == MatchStatus.Ready);
            if (active == null) { battle = null; return; }
            tournament.StartMatch(active.Id); StartBattle();
        }
        private void StartBattle()
        {
            battle = new MatchManager(tournament.Teams.Single(t => t.Id == active.Left), tournament.Teams.Single(t => t.Id == active.Right), (uint)(33 + active.RoundIndex * 101 + rematch), Resources.Load<HeroCatalogAsset>("HeroCatalog")?.Build(), settings); submitted = false; selectedUnit = 0; accumulator = botClock = 0;
            for (int side = 0; side < 2; side++)
            {
                float center = side == 0 ? -5.5f : 5.5f;
                stage.Add(Shape("Battle platform", PrimitiveType.Cube, new Vector3(center, -.2f, 0), new Vector3(10, .3f, 7), new Color(.06f, .11f, .19f)));
                for (int cell = 0; cell < 40; cell++) stage.Add(Shape("Deployment tile", PrimitiveType.Cube, World(side, cell) + Vector3.down * .05f, new Vector3(.88f, .08f, .88f), new Color(.10f, .20f, .28f)));
                stage.Add(Shape("Astra crystal", PrimitiveType.Sphere, new Vector3(center, .6f, 0), new Vector3(.5f, 1.2f, .5f), new Color(.2f, 1, .8f)));
            }
        }
        private static Vector3 World(int side, int cell) => new Vector3((side == 0 ? -5.5f : 5.5f) + cell % 8 - 3.5f, .35f, cell / 8 - 2);
        private void OnApplicationFocus(bool value) { focused = value; accumulator = 0; }
        private void Update()
        {
            Camera.main.orthographicSize = Mathf.Max(9, 12 / Camera.main.aspect);
            foreach (var pulse in pulses.ToArray()) if (Time.unscaledTime >= pulse.Item2) { pulse.Item1.gameObject.SetActive(false); lines.Enqueue(pulse.Item1); pulses.Remove(pulse); }
            if (battle == null || !focused) return;
            accumulator = Math.Min(.25, accumulator + Time.unscaledDeltaTime);
            while (accumulator >= .05)
            {
                botClock += .05;
                if (botClock >= 2) { botClock = 0; foreach (var field in new[] { battle.Left, battle.Right }) foreach (var owner in field.Coins.Keys.Where(id => id != human)) { Try(() => { if (field.Coins[owner] >= field.SummonSettings.Cost) field.Summon(owner, "bot-" + ++command); var group = field.Units.Where(u => u.Owner == owner && field.Catalog.Heroes[u.HeroId].NextId != null).GroupBy(u => u.HeroId).FirstOrDefault(g => g.Count() >= 3); if (group != null) field.Merge(owner, group.Take(3).Select(u => u.Id).ToArray(), "bot-merge-" + ++command); }); } }
                battle.Tick(.05); DrawField(battle.Left, 0); DrawField(battle.Right, 1); accumulator -= .05;
                if (battle.WinnerTeamId != null && !submitted) { tournament.CompleteMatch(active.Id, battle.WinnerTeamId); submitted = true; }
            }
        }
        private void DrawField(BattlefieldManager field, int side)
        {
            var alive = new HashSet<string>();
            foreach (var u in field.Units)
            {
                string key = side + "u" + u.Id; alive.Add(key);
                if (!views.TryGetValue(key, out var go))
                {
                    go = new GameObject(field.Catalog.Heroes[u.HeroId].Name); views[key] = go; var color = new[] { new Color(.35f,.7f,.8f), Color.cyan, new Color(.6f,.3f,1), new Color(1,.7f,.2f), new Color(1,.35f,.7f) }[(int)field.Catalog.Heroes[u.HeroId].Grade];
                    var body = Shape("Armored body", PrimitiveType.Capsule, Vector3.zero, new Vector3(.38f,.45f,.38f), color); body.transform.SetParent(go.transform, false);
                    var head = Shape("Helmet", PrimitiveType.Sphere, new Vector3(0,.52f,0), Vector3.one*.32f, color); head.transform.SetParent(go.transform, false);
                    var weapon = Shape("Energy staff", PrimitiveType.Cube, new Vector3(.3f,.15f,.1f), new Vector3(.08f,.8f,.08f), Color.white); weapon.transform.SetParent(go.transform, false);
                }
                go.transform.position = World(side, u.Cell);
            }
            foreach (var m in field.Monsters)
            {
                string key = side + "m" + m.Id; alive.Add(key); if (!views.TryGetValue(key, out var go)) { go = Shape("Void creature", PrimitiveType.Cube, Vector3.zero, Vector3.one * (m.Type == MonsterType.Boss ? .9f : .45f), new Color(.7f,.18f,.48f)); views[key] = go; var hp = Shape("HP bar", PrimitiveType.Cube, Vector3.up, new Vector3(1,.08f,.08f), Color.green); hp.transform.SetParent(go.transform, false); }
                var pos = BattlefieldManager.Path(m.Progress); go.transform.position = new Vector3((side == 0 ? -5.5f : 5.5f) + (float)pos.Item1 - 4, .5f, (float)pos.Item2 - 2.5f); go.transform.GetChild(0).localScale = new Vector3((float)Math.Max(0,m.Hp/m.MaxHp),.08f,.08f);
            }
            foreach (var e in field.Events) { if (lines.Count == 0) break; var unit = field.Units.FirstOrDefault(u => u.Id == e.UnitId); if (unit == null) continue; var line = lines.Dequeue(); var p = BattlefieldManager.Path(e.TargetProgress); line.startColor = line.endColor = e.Critical ? Color.yellow : Color.cyan; line.SetPosition(0, World(side, unit.Cell) + Vector3.up*.5f); line.SetPosition(1,new Vector3((side==0?-5.5f:5.5f)+(float)p.Item1-4,.6f,(float)p.Item2-2.5f)); line.gameObject.SetActive(true); pulses.Add(Tuple.Create(line,Time.unscaledTime+.12f)); }
            foreach (var key in views.Keys.Where(k => k.StartsWith(side.ToString()) && !alive.Contains(k)).ToArray()) { Destroy(views[key]); views.Remove(key); }
        }
        private GameObject Shape(string name, PrimitiveType type, Vector3 position, Vector3 scale, Color color) { var go = GameObject.CreatePrimitive(type); go.name = name; go.transform.position = position; go.transform.localScale = scale; var collider = go.GetComponent<Collider>(); if (collider != null) Destroy(collider); go.GetComponent<Renderer>().material.color = color; return go; }
        private void Try(Action action) { try { action(); notice = "Command accepted"; } catch (Exception e) { notice = e.Message; } }
        private void OnGUI()
        {
            float scale = Mathf.Min(Screen.width/1000f, Screen.height/720f); GUI.matrix = Matrix4x4.Scale(new Vector3(scale,scale,1)); float width=Screen.width/scale,height=Screen.height/scale;
            GUILayout.BeginArea(new Rect(14,12,width-28,160), GUI.skin.box); GUILayout.Label("ASTRA FORGE  |  LOCAL PROTOTYPE - ONLINE NOT CONNECTED");
            if (tournament == null) { GUILayout.Label("Participants: " + participants + " | odd: solo teams / even 4+: two-player teams"); GUILayout.BeginHorizontal(); if (GUILayout.Button("-")) participants=Math.Max(2,participants-1); if (GUILayout.Button("+")) participants=Math.Min(8,participants+1); if (GUILayout.Button("Start local tournament")) Begin(); GUILayout.EndHorizontal(); }
            else { GUILayout.Label(string.Join(" / ", tournament.Teams.Select(t=>t.Id+": "+string.Join(",",t.PlayerIds)))); GUILayout.Label("Bracket: "+string.Join(" | ",tournament.Matches.Select(m=>m.Id+" "+m.Status+(m.WinnerTeamId!=null?" > "+m.WinnerTeamId:"")))); if (tournament.TournamentWinnerId!=null) { GUILayout.Label("CHAMPION: "+tournament.TournamentWinnerId); if(GUILayout.Button("New tournament")){tournament=null;battle=null;} } }
            GUILayout.Label(notice); GUILayout.EndArea(); if(battle==null)return;
            var own=battle.Left.Coins.ContainsKey(human)?battle.Left:battle.Right.Coins.ContainsKey(human)?battle.Right:null;
            GUILayout.BeginArea(new Rect(14,height-225,width-28,212),GUI.skin.box); GUILayout.Label("LEFT WAVE "+battle.Left.Wave+" HP "+battle.Left.BaseHp+"   |   RIGHT WAVE "+battle.Right.Wave+" HP "+battle.Right.BaseHp);
            if(battle.RequiresRematch){GUILayout.Label("Tie - rematch required");if(GUILayout.Button("Replay same teams, reset battle")){rematch++;StartBattle();}}
            else if(submitted){GUILayout.Label("Winner: "+battle.WinnerTeamId);if(tournament.TournamentWinnerId==null&&GUILayout.Button("Next match - fresh battle"))NextMatch();}
            else if(own!=null){GUILayout.Label("Your coins: "+own.Coins[human]+" / units "+own.Units.Count+" / selected "+selectedUnit);GUILayout.BeginHorizontal();if(GUILayout.Button("Summon " + own.SummonSettings.Cost))Try(()=>selectedUnit=own.Summon(human,"human-"+ ++command).Id);if(GUILayout.Button("Merge matching 3"))Try(()=>{var group=own.Units.Where(u=>u.Owner==human&&own.Catalog.Heroes[u.HeroId].NextId!=null).GroupBy(u=>u.HeroId).First(g=>g.Count()>=3);selectedUnit=own.Merge(human,group.Take(3).Select(u=>u.Id).ToArray(),"human-"+ ++command).Id;});if(GUILayout.Button("Upgrade selected"))Try(()=>own.Upgrade(human,selectedUnit,"human-"+ ++command));GUILayout.EndHorizontal();
                GUILayout.BeginHorizontal();foreach(var recipe in own.Catalog.Recipes.Values)if(GUILayout.Button(recipe.Id+": "+string.Join("+",recipe.Materials.Select(m=>m.Key+"x"+m.Value))))Try(()=>selectedUnit=own.Combine(human,recipe.Id,"human-"+ ++command).Id);GUILayout.EndHorizontal();
                for(int y=0;y<5;y++){GUILayout.BeginHorizontal();for(int x=0;x<8;x++){int cell=y*8+x;var unit=own.Units.FirstOrDefault(u=>u.Cell==cell);if(GUILayout.Button(unit==null?".":unit.HeroId+" #"+unit.Id,GUILayout.Height(18))){if(unit?.Owner==human)selectedUnit=unit.Id;else if(unit==null&&selectedUnit!=0)Try(()=>{own.Move(human,selectedUnit,cell,"human-"+ ++command);selectedUnit=0;});}}GUILayout.EndHorizontal();}}
            else GUILayout.Label("Your team is waiting or eliminated. Local bots are playing this match.");GUILayout.EndArea();
        }
    }
}


