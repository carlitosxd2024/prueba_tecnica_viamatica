<?php

namespace Tests;

use App\Domain\User\MailGenerator;
use App\Domain\User\UserRules;
use PHPUnit\Framework\TestCase;

class DomainRulesTest extends TestCase
{
    public function test_mail_base_example_from_spec(): void
    {
        $this->assertSame('jpiguavel', MailGenerator::base('Juan Alberto', 'Piguave Loor'));
    }

    public function test_mail_base_with_accents_and_single_surname(): void
    {
        $this->assertSame('mnunez', MailGenerator::base('María José', 'Núñez'));
    }

    public function test_username_rules(): void
    {
        $this->assertSame([], UserRules::username('Usuario2024'));
        $this->assertNotEmpty(UserRules::username('usuario2024'));   // sin mayuscula
        $this->assertNotEmpty(UserRules::username('UsuarioAbcd'));   // sin numero
        $this->assertNotEmpty(UserRules::username('Usuar_o2024'));   // signo
        $this->assertNotEmpty(UserRules::username('Us1'));           // corto
        $this->assertNotEmpty(UserRules::username('Usuario2024Usuario2024X')); // largo
    }

    public function test_password_rules(): void
    {
        $this->assertSame([], UserRules::password('Admin#2024'));
        $this->assertNotEmpty(UserRules::password('admin#2024'));    // sin mayuscula
        $this->assertNotEmpty(UserRules::password('Admin2024'));     // sin signo
        $this->assertNotEmpty(UserRules::password('Admin #2024'));   // espacio
        $this->assertNotEmpty(UserRules::password('Ad#1'));          // corta
    }

    public function test_identificacion_rules(): void
    {
        $this->assertSame([], UserRules::identificacion('1203574901'));
        $this->assertNotEmpty(UserRules::identificacion('1008888471')); // 8888
        $this->assertNotEmpty(UserRules::identificacion('12035749'));   // corta
        $this->assertNotEmpty(UserRules::identificacion('12035749AB')); // letras
        $this->assertSame([], UserRules::identificacion('1118882221')); // 3 repetidos esta permitido
    }
}
