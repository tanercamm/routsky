using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Routiq.Api.Data;
using Routiq.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── CORS ──
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// ── Database ──
builder.Services.AddDbContext<RoutiqDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── V2 Services ──
builder.Services.AddScoped<IRouteGenerator, RouteGenerator>();
builder.Services.AddScoped<IAuthService, AuthService>();

// ── MCP Decision Services (Agent-as-Orchestrator) ──
builder.Services.AddScoped<RouteFeasibilityService>();
builder.Services.AddScoped<BudgetConsistencyService>();
builder.Services.AddScoped<TimeOverlapService>();
builder.Services.AddScoped<DecisionSolverService>();
builder.Services.AddHttpClient<AgentInsightService>();

// ── JWT Authentication ──
var key = System.Text.Encoding.ASCII.GetBytes(
    builder.Configuration["Jwt:Key"] ?? "SuperSecretKeyForDevelopmentOnly123!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        // Allow React to send enum values as strings (e.g. "Budget", "SoutheastAsia")
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ── V2 Database Seed ──
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<RoutiqDbContext>();
        await DbInitializer.SeedAsync(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the V2 database.");
    }
}

// ── Pipeline ──
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
