using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Routsky.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixAvatarColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarBase64",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfilePictureBase64",
                table: "UserProfiles",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvatarBase64",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfilePictureBase64",
                table: "UserProfiles");
        }
    }
}
