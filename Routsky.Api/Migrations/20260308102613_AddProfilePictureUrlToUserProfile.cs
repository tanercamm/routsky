using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Routsky.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProfilePictureUrlToUserProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfilePictureUrl",
                table: "UserProfiles",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfilePictureUrl",
                table: "UserProfiles");
        }
    }
}
