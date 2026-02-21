const { createApp } = Vue;

createApp({
    data() {
        return {
            tela: 'login',
            subTelaRelatorio: 'dia',
            matriculaSucesso: false,
            ultimoAlunoCadastrado: '',
            loginEmail: '', loginSenha: '', erroLogin: '',
            usuarioLogado: null,
            iaCarregando: false,
            dataSelecionada: new Date().toISOString().split('T')[0],
            dataFiltro: new Date().toISOString().split('T')[0],
            textoTemporario: '', novoAlunoNome: '',
            alunoEditando: null, alunoPerfil: null, relIndividual: { p: 0, f: 0 },
            titulos: { home: 'Diário de Classe', chamada: 'Frequência', filtro: 'Relatórios', gestaoAlunos: 'Turma', gestaoProfessores: 'Diretoria', cadastrarProfessor: 'Novo Docente', professoresExistentes: 'Corpo Docente', editarProfessor: 'Editar Docente', dadosProfessor: 'Perfil do Docente' },
            alunos: [], historico: [], anotacoes: {}, professores: [],
            novoProfessorEmail: '', novoProfessorSenha: '', novoProfessorNome: '', novoProfessorDataNasc: '', novoProfessorMatricula: '', novoProfessorTelefone: '',
            novoProfessorRole: 'professor',
            cadastroProfessorSucesso: false,
            professorEditando: null, professorPerfil: null
        }
    },
    computed: {
        dadosDia() {
            if (this.historico.length === 0 || this.alunos.length === 0) return null;
            const registros = this.historico.filter(h => h.data === this.dataFiltro);
            if (registros.length === 0) return null;
            const lista = this.alunos.map(aluno => {
                const reg = registros.find(r => r.alunoId === aluno.id);
                return { ...aluno, status: reg ? reg.status : '?', professor: reg ? reg.professor : 'Sistema' };
            });
            return { lista, presencaTotal: Math.round((registros.filter(r => r.status === 'P').length / this.alunos.length) * 100) };
        },
        ordenadasAnotacoes() {
            return Object.keys(this.anotacoes).sort((a, b) => new Date(b) - new Date(a)).reduce((obj, key) => {
                obj[key] = this.anotacoes[key];
                return obj;
            }, {});
        }
    },
    methods: {
        salvarNoLocalStorage() {
            localStorage.setItem('diario_usuarios', JSON.stringify(this.professores));
            localStorage.setItem('diario_alunos', JSON.stringify(this.alunos));
            localStorage.setItem('diario_chamadas', JSON.stringify(this.historico));
            localStorage.setItem('diario_anotacoes', JSON.stringify(this.anotacoes));
        },
        carregarDoLocalStorage() {
            this.professores = JSON.parse(localStorage.getItem('diario_usuarios')) || [{ email: 'admin@admin.com', senha: 'admin123', nome: 'Admin', role: 'admin' }];
            this.alunos = JSON.parse(localStorage.getItem('diario_alunos')) || [];
            this.historico = JSON.parse(localStorage.getItem('diario_chamadas')) || [];
            this.anotacoes = JSON.parse(localStorage.getItem('diario_anotacoes')) || {};
            // Pre-save initial admin if not exists
            if (!localStorage.getItem('diario_usuarios')) this.salvarNoLocalStorage();
        },
        async realizarLogin() {
            const user = this.professores.find(p => p.email === this.loginEmail && p.senha === this.loginSenha);
            if (user) {
                this.usuarioLogado = user;
                this.tela = 'home';
            } else {
                this.erroLogin = "E-mail ou senha incorretos.";
            }
        },
        async logout() {
            this.usuarioLogado = null;
            this.tela = 'login';
            this.loginEmail = '';
            this.loginSenha = '';
        },
        async adicionarAluno() {
            if (!this.novoAlunoNome.trim()) return;
            const nome = this.novoAlunoNome.trim().toUpperCase();
            const novoAluno = { id: Date.now().toString(), nome, criadoPor: this.usuarioLogado.nome };
            this.alunos.push(novoAluno);
            this.salvarNoLocalStorage();

            this.ultimoAlunoCadastrado = nome; this.novoAlunoNome = ''; this.matriculaSucesso = true;
        },
        async abrirEdicao(aluno) { this.alunoEditando = { ...aluno }; this.tela = 'editarAluno'; },
        async salvarEdicao() {
            const index = this.alunos.findIndex(a => a.id === this.alunoEditando.id);
            if (index !== -1) {
                this.alunos[index].nome = this.alunoEditando.nome.toUpperCase();
                this.salvarNoLocalStorage();
            }
            this.tela = 'alunosExistentes';
        },
        async removerAluno() {
            if (confirm("Excluir permanentemente?")) {
                this.alunos = this.alunos.filter(a => a.id !== this.alunoEditando.id);
                this.historico = this.historico.filter(h => h.alunoId !== this.alunoEditando.id);
                this.salvarNoLocalStorage();
                this.tela = 'alunosExistentes';
            }
        },
        async salvarChamada() {
            if (this.textoTemporario) {
                this.anotacoes[this.dataSelecionada] = { texto: this.textoTemporario, autor: this.usuarioLogado.nome };
            }
            this.salvarNoLocalStorage();
            this.textoTemporario = ''; this.tela = 'home'; alert("Finalizado por: " + this.usuarioLogado.nome);
        },
        marcar(id, s) {
            const r = { data: this.dataSelecionada, alunoId: id, status: s, professor: this.usuarioLogado.nome.split(' ')[0] };
            this.historico = this.historico.filter(h => !(h.alunoId === id && h.data === this.dataSelecionada));
            this.historico.push(r);
        },
        getStatus(id) {
            const r = this.historico.find(h => h.alunoId === id && h.data === this.dataSelecionada);
            return r ? r.status : null;
        },
        irParaHome() { this.tela = 'home'; this.matriculaSucesso = false; this.cadastroProfessorSucesso = false; },
        async cadastrarProfessor() {
            if (!this.novoProfessorEmail.trim() || !this.novoProfessorSenha.trim() || !this.novoProfessorNome.trim()) {
                alert("Por favor, preencha pelo menos E-mail, Senha e Nome.");
                return;
            }

            const existe = this.professores.find(p => p.email === this.novoProfessorEmail);
            if (existe) { alert("Este e-mail já está cadastrado."); return; }

            this.professores.push({
                email: this.novoProfessorEmail,
                senha: this.novoProfessorSenha,
                nome: this.novoProfessorNome,
                nascimento: this.novoProfessorDataNasc,
                matricula: this.novoProfessorMatricula,
                telefone: this.novoProfessorTelefone,
                role: this.novoProfessorRole
            });
            this.salvarNoLocalStorage();

            this.novoProfessorEmail = '';
            this.novoProfessorSenha = '';
            this.novoProfessorNome = '';
            this.novoProfessorDataNasc = '';
            this.novoProfessorMatricula = '';
            this.novoProfessorTelefone = '';
            this.novoProfessorRole = 'professor';
            this.cadastroProfessorSucesso = true;
        },
        formatarData(d) { if (!d) return ""; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; },
        gerarRelatorioGeral() {
            const diasDistintos = [...new Set(this.historico.map(h => h.data))];
            const totalDias = diasDistintos.length || 1;
            return this.alunos.map(aluno => {
                const p = this.historico.filter(h => h.alunoId === aluno.id && h.status === 'P').length;
                const f = this.historico.filter(h => h.alunoId === aluno.id && h.status === 'F').length;
                return { nome: aluno.nome, p, f, porcentagem: Math.round((p / totalDias) * 100) }
            }).sort((a, b) => b.porcentagem - a.porcentagem);
        },
        gerarTextoIA() {
            this.iaCarregando = true;
            setTimeout(() => {
                this.textoTemporario = "A sessão pedagógica transcorreu conforme o planejado, com engajamento satisfatório do corpo discente.";
                this.iaCarregando = false;
            }, 1200);
        },
        verDadosAluno(aluno) {
            this.alunoPerfil = aluno;
            this.relIndividual.p = this.historico.filter(h => h.alunoId === aluno.id && h.status === 'P').length;
            this.relIndividual.f = this.historico.filter(h => h.alunoId === aluno.id && h.status === 'F').length;
            this.tela = 'dadosAluno';
        },
        async abrirEdicaoProfessor(professor) {
            this.professorEditando = { ...professor };
            this.tela = 'editarProfessor';
        },
        async salvarEdicaoProfessor() {
            const index = this.professores.findIndex(p => p.email === this.professorEditando.email);
            if (index !== -1) {
                // Não permite trocar o email que é a "chave" de login por enquanto
                this.professores[index].nome = this.professorEditando.nome;
                this.professores[index].senha = this.professorEditando.senha;
                this.professores[index].telefone = this.professorEditando.telefone;
                this.professores[index].matricula = this.professorEditando.matricula;
                this.professores[index].nascimento = this.professorEditando.nascimento;
                this.salvarNoLocalStorage();
            }
            this.tela = 'professoresExistentes';
        },
        async removerProfessor() {
            if (this.professorEditando.role === 'admin') {
                alert("Não é possível excluir o administrador principal.");
                return;
            }
            if (confirm("Excluir conta deste professor permanentemente?")) {
                this.professores = this.professores.filter(p => p.email !== this.professorEditando.email);
                this.salvarNoLocalStorage();
                this.tela = 'professoresExistentes';
            }
        },
        verDadosProfessor(professor) {
            this.professorPerfil = professor;
            this.tela = 'dadosProfessor';
        }
    },
    mounted() {
        this.carregarDoLocalStorage();
    }
}).mount('#app')
